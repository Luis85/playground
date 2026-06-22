using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.AspNetCore.Components;

var outputPath = args.Length > 0 ? args[0] : Path.Combine("..", "component-knowledge.json");

var assembly = typeof(Radzen.Blazor.RadzenButton).Assembly;
var version = assembly.GetName().Version?.ToString() ?? "unknown";

// Load XML doc summaries if the package ships them. Probe next to the assembly
// (NuGet cache) and the app base dir (where CopyDocumentationFilesFromPackages
// places them). Radzen.Blazor may ship no XML docs, in which case summaries stay
// empty — see docs/adr/0001.
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

var components = new List<object>();
var summaryCount = 0;
foreach (var type in assembly.GetExportedTypes().Where(IsComponent).OrderBy(t => t.Name))
{
    object? instance = null;
    try { instance = Activator.CreateInstance(type); } catch { /* leave defaults null */ }

    var parameters = new List<object>();
    var events = new List<object>();

    foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                             .Where(p => p.GetCustomAttribute<ParameterAttribute>() is not null)
                             .OrderBy(p => p.Name))
    {
        var memberKey = $"P:{prop.DeclaringType!.FullName}.{prop.Name}";
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
                try { def = JsonSerializer.Serialize(prop.GetValue(instance)); }
                catch { def = null; }
            }
            parameters.Add(new { name = prop.Name, type = TypeName(prop.PropertyType), @default = def, description });
        }
    }

    var typeKey = $"T:{type.FullName}";
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

var doc = new { radzenVersion = version, components };
var json = JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true });
File.WriteAllText(outputPath, json);
Console.WriteLine($"Wrote {components.Count} components to {outputPath}");
Console.WriteLine($"Summaries populated: {summaryCount}/{components.Count}"
    + (summaryCount == 0 ? " (Radzen.Blazor ships no XML docs; summaries left empty — see docs/adr/0001)" : ""));
