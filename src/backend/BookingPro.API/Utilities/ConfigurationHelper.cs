using System.Text.RegularExpressions;

namespace BookingPro.API.Utilities
{
    public static class ConfigurationHelper
    {
        public static string GetConnectionString(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
           
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");
            }
           
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("No database connection string found");
            }
           
            if (connectionString.Contains("Host=") || connectionString.Contains("Server="))
            {
                return connectionString;
            }
           
            return ConvertPostgreSqlUrlToConnectionString(connectionString);
        }
       
        private static string ConvertPostgreSqlUrlToConnectionString(string databaseUrl)
        {
            var regex = new Regex(@"^postgres(?:ql)?://(?<username>[^:]+):(?<password>[^@]+)@(?<host>[^:]+):(?<port>\d+)/(?<database>[^?]+)(?:\?(?<params>.*))?$");
            var match = regex.Match(databaseUrl);
           
            if (!match.Success)
            {
                return databaseUrl;
            }
           
            var host = match.Groups["host"].Value;
            var port = match.Groups["port"].Value;
            var database = match.Groups["database"].Value;
            var username = match.Groups["username"].Value;
            var password = match.Groups["password"].Value;
            var parameters = match.Groups["params"].Value;
           
            var connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password}";
           
            if (parameters.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase))
            {
                connectionString += ";SslMode=Require";
            }
           
            return connectionString;
        }
    }
}