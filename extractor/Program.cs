using System.Globalization;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.AspNetCore.Components;

// Pin the culture so serialized values (numbers, etc.) are stable across CI
// runners regardless of their locale, preventing spurious knowledge-base diffs.
CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;

// Serialize enum defaults as their member names (e.g. "Primary") rather than the
// underlying integer, so consumers see meaningful default values.
var defaultOptions = new JsonSerializerOptions { Converters = { new JsonStringEnumConverter() } };

var outputPath = args.Length > 0 ? args[0] : Path.Combine("..", "component-knowledge.json");

var assembly = typeof(Radzen.Blazor.RadzenButton).Assembly;
var version = assembly.GetName().Version?.ToString() ?? "unknown";

// Load XML doc summaries shipped by the package. Probe next to the assembly
// (NuGet cache) and the app base dir (where CopyDocumentationFilesFromPackages
// places them). Radzen.Blazor ships these XML docs, so summaries are populated
// when the file is found.
var summaries = new Dictionary<string, string>();
var xmlCandidates = new[]
{
    Path.ChangeExtension(assembly.Location, ".xml"),
    Path.Combine(AppContext.BaseDirectory, "Radzen.Blazor.xml"),
};
var xmlPath = xmlCandidates.FirstOrDefault(File.Exists);
if (xmlPath is not null)
{
    foreach (var member in XDocument.Load(xmlPath).Descendants("member"))
    {
        var name = member.Attribute("name")?.Value;
        var summary = member.Element("summary")?.Value;
        if (name is not null && summary is not null)
            summaries[name] = Regex.Replace(summary.Trim(), "\\s+", " ");
    }
}

static string TypeName(Type t)
{
    if (!t.IsGenericType) return t.Name;
    var args = string.Join(", ", t.GetGenericArguments().Select(TypeName));
    return $"{t.Name[..t.Name.IndexOf('`')]}<{args}>";
}

// The Razor component name without the CLR generic-arity suffix
// (e.g. "RadzenDataGrid`1" -> "RadzenDataGrid").
static string ComponentName(Type t) =>
    t.Name.Contains('`') ? t.Name[..t.Name.IndexOf('`')] : t.Name;

static bool IsComponent(Type t) =>
    t.IsClass && !t.IsAbstract && t.IsPublic &&
    typeof(ComponentBase).IsAssignableFrom(t) &&
    t.Name.StartsWith("Radzen", StringComparison.Ordinal);

// Full name used to build XML-doc member keys. For properties inherited from a
// closed generic base (e.g. FormComponent<object>) the constructed type's
// FullName carries type-argument suffixes that never match the XML key, so fall
// back to the open generic definition's clean backtick name
// (e.g. "Radzen.FormComponent`1").
static string? XmlDeclaringName(Type t) =>
    t.IsConstructedGenericType ? t.GetGenericTypeDefinition().FullName : t.FullName;

// Distance of a type from object, used to choose the most-derived property when
// a name is redeclared with `new` (which would otherwise be ambiguous).
static int InheritanceDepth(Type t)
{
    var depth = 0;
    for (var b = t.BaseType; b is not null; b = b.BaseType) depth++;
    return depth;
}

// Only emit a `default` for stable scalar values. Volatile/object defaults
// (DateTime.Today, collections, CSS strings, CultureInfo, ...) would bake
// runner-/run-specific noise into the knowledge base, so return null for them.
static string? StableDefault(object? value, JsonSerializerOptions options)
{
    if (value is null) return null;
    var t = value.GetType();
    var allowed = t.IsEnum || t == typeof(string) || t == typeof(bool) ||
        t == typeof(byte) || t == typeof(sbyte) ||
        t == typeof(short) || t == typeof(ushort) ||
        t == typeof(int) || t == typeof(uint) ||
        t == typeof(long) || t == typeof(ulong) ||
        t == typeof(float) || t == typeof(double) || t == typeof(decimal) ||
        t == typeof(char) || t == typeof(nint) || t == typeof(nuint);
    return allowed ? JsonSerializer.Serialize(value, options) : null;
}

var components = new List<object>();
var summaryCount = 0;
foreach (var type in assembly.GetExportedTypes().Where(IsComponent).OrderBy(x => x.Name, StringComparer.Ordinal))
{
    // Close open generic component definitions (e.g. RadzenDataGrid<TItem>) with a
    // concrete type argument so an instance can be created and real parameter
    // defaults read. Falls back to null defaults if constraints reject `object`.
    Type concrete = type;
    object? instance = null;
    try
    {
        concrete = type.IsGenericTypeDefinition
            ? type.MakeGenericType(type.GetGenericArguments().Select(_ => typeof(object)).ToArray())
            : type;
        instance = Activator.CreateInstance(concrete);
    }
    catch { instance = null; }

    var parameters = new List<object>();
    var events = new List<object>();

    foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                             .Where(p => p.GetCustomAttribute<ParameterAttribute>() is not null)
                             .OrderBy(x => x.Name, StringComparer.Ordinal))
    {
        var memberKey = $"P:{XmlDeclaringName(prop.DeclaringType!)}.{prop.Name}";
        var description = summaries.TryGetValue(memberKey, out var s) ? s : "";

        var isEvent =
            prop.PropertyType == typeof(EventCallback) ||
            (prop.PropertyType.IsGenericType &&
             prop.PropertyType.GetGenericTypeDefinition() == typeof(EventCallback<>));

        if (isEvent)
        {
            events.Add(new { name = prop.Name, type = TypeName(prop.PropertyType), description });
        }
        else
        {
            string? def = null;
            if (instance is not null)
            {
                // Read the property's default value off the closed type so generic
                // components work. GetProperty(name) throws AmbiguousMatchException
                // when a derived class redeclares a property with `new`, so resolve
                // the live property without ambiguity rather than relying on it.
                try
                {
                    PropertyInfo? liveProp;
                    if (!concrete.IsConstructedGenericType && prop.DeclaringType == concrete)
                    {
                        // Non-generic component, property declared here: `prop` is
                        // already the live property on the instance's type.
                        liveProp = prop;
                    }
                    else
                    {
                        // Pick the most-derived readable property matching by name.
                        liveProp = concrete
                            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                            .Where(p => p.Name == prop.Name && p.CanRead)
                            .OrderByDescending(p => InheritanceDepth(p.DeclaringType!))
                            .FirstOrDefault();
                    }

                    if (liveProp is not null)
                        def = StableDefault(liveProp.GetValue(instance), defaultOptions);
                }
                catch { def = null; }
            }
            parameters.Add(new { name = prop.Name, type = TypeName(prop.PropertyType), @default = def, description });
        }
    }

    var typeKey = $"T:{XmlDeclaringName(type)}";
    var summary = summaries.TryGetValue(typeKey, out var ts) ? ts : "";
    if (!string.IsNullOrEmpty(summary)) summaryCount++;

    // Razor generic type parameters (e.g. TItem on RadzenDataGrid<TItem>) are
    // legal attributes but are not [Parameter] properties.
    var typeParameters = type.IsGenericTypeDefinition
        ? type.GetGenericArguments().Select(a => a.Name).ToArray()
        : Array.Empty<string>();

    components.Add(new
    {
        name = ComponentName(type),
        summary,
        typeParameters,
        parameters,
        events,
    });
}

// Radzen.Blazor ships XML docs, so a non-empty component set with zero summaries
// means the docs failed to load (e.g. the .xml wasn't copied next to the
// assembly). Fail loudly so CI doesn't write/commit an all-empty knowledge base.
if (summaryCount == 0 && components.Count > 0)
{
    Console.Error.WriteLine(
        "ERROR: no component summaries were populated, but XML docs are expected. " +
        "The Radzen.Blazor XML documentation file was likely not found next to the " +
        "assembly — refusing to write an empty knowledge base.");
    Environment.Exit(1);
}

var doc = new { radzenVersion = version, components };
var json = JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true });
File.WriteAllText(outputPath, json);
Console.WriteLine($"Wrote {components.Count} components to {outputPath}");
Console.WriteLine($"Summaries populated: {summaryCount}/{components.Count}");
