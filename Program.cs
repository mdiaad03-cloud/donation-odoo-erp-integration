using DonationOdooIntegration.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<IIntegrationEngine, IntegrationEngine>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");

if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Donation Call-Center & Odoo ERP API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseAuthorization();
app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    Title = "Donation Call-Center & Odoo ERP Integration API (.NET 10)",
    Author = "Mohamed Diaa El-Din Samy",
    Framework = "ASP.NET Core 10 Web API",
    Patterns = "Transactional Outbox & Integration Inbox Patterns",
    Swagger = "/swagger",
    Endpoints = new[]
    {
        "GET /api/v1/outbox/poll?batchSize=50",
        "POST /api/v1/outbox/ack",
        "POST /api/v1/inbox/process",
        "POST /api/v1/deposits/allocate"
    }
}));

app.Run();
