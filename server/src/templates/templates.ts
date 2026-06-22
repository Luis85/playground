export interface TemplateOption {
  name: string;
  description: string;
  default: string;
}

export interface Template {
  id: string;
  title: string;
  summary: string;
  options: TemplateOption[];
  /** Receives options with defaults already applied. */
  render: (opts: Record<string, string>) => string;
}

export const templates: Template[] = [
  {
    id: "form",
    title: "Validated form",
    summary: "RadzenTemplateForm with a field, validator, and submit button.",
    options: [
      { name: "item_type", description: "The model type bound to the form.", default: "Model" },
      { name: "submit", description: "Submit handler method name.", default: "OnSubmit" },
    ],
    render: (o) =>
      [
        `<RadzenTemplateForm TItem="${o.item_type}" Data="@model" Submit="@${o.submit}">`,
        `    <RadzenStack Gap="1rem">`,
        `        <RadzenFormField Text="Name">`,
        `            <RadzenTextBox Name="Name" @bind-Value="@model.Name" />`,
        `            <RadzenRequiredValidator Component="Name" Text="Name is required" />`,
        `        </RadzenFormField>`,
        `        <RadzenButton ButtonType="ButtonType.Submit" Text="Save" />`,
        `    </RadzenStack>`,
        `</RadzenTemplateForm>`,
      ].join("\n"),
  },
  {
    id: "datagrid",
    title: "Data grid",
    summary: "RadzenDataGrid with paging/sorting/filtering and a column.",
    options: [
      { name: "item_type", description: "The row item type.", default: "Item" },
      { name: "data", description: "Field holding the data source.", default: "items" },
    ],
    render: (o) =>
      [
        `<RadzenDataGrid Data="@${o.data}" TItem="${o.item_type}" AllowPaging="true" PageSize="10" AllowSorting="true" AllowFiltering="true">`,
        `    <Columns>`,
        `        <RadzenDataGridColumn TItem="${o.item_type}" Property="Id" Title="Id" />`,
        `        <!-- add more RadzenDataGridColumn entries -->`,
        `    </Columns>`,
        `</RadzenDataGrid>`,
      ].join("\n"),
  },
  {
    id: "layout",
    title: "App layout shell",
    summary: "RadzenLayout with header, collapsible sidebar menu, and body.",
    options: [{ name: "app", description: "App title shown in the header.", default: "My App" }],
    render: (o) =>
      [
        `<RadzenLayout>`,
        `    <RadzenHeader>`,
        `        <RadzenStack Orientation="Orientation.Horizontal" AlignItems="AlignItems.Center" Gap="0.5rem">`,
        `            <RadzenSidebarToggle Click="@(() => sidebarExpanded = !sidebarExpanded)" />`,
        `            <RadzenLabel Text="${o.app}" />`,
        `        </RadzenStack>`,
        `    </RadzenHeader>`,
        `    <RadzenSidebar @bind-Expanded="@sidebarExpanded">`,
        `        <RadzenPanelMenu>`,
        `            <RadzenPanelMenuItem Text="Home" Icon="home" Path="/" />`,
        `        </RadzenPanelMenu>`,
        `    </RadzenSidebar>`,
        `    <RadzenBody>@Body</RadzenBody>`,
        `</RadzenLayout>`,
      ].join("\n"),
  },
  {
    id: "dashboard",
    title: "Dashboard card grid",
    summary: "A responsive RadzenRow of RadzenCard tiles.",
    options: [{ name: "cards", description: "Number of cards (1-12).", default: "3" }],
    render: (o) => {
      const n = Math.min(12, Math.max(1, Number.parseInt(o.cards, 10) || 3));
      const sizeMd = Math.max(1, Math.floor(12 / n));
      const cols = Array.from({ length: n }, (_, i) =>
        [
          `    <RadzenColumn Size="12" SizeMD="${sizeMd}">`,
          `        <RadzenCard>`,
          `            <RadzenText TextStyle="TextStyle.H6">Card ${i + 1}</RadzenText>`,
          `        </RadzenCard>`,
          `    </RadzenColumn>`,
        ].join("\n"),
      ).join("\n");
      return [`<RadzenRow Gap="1rem">`, cols, `</RadzenRow>`].join("\n");
    },
  },
];
