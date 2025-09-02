using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BookingPro.API.Data
{
    public static class ApplicationDbContextSeed
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            if (!await context.Verticals.AnyAsync())
            {
                await SeedVerticals(context);
            }

            if (!await context.Plans.AnyAsync())
            {
                await SeedPlans(context);
            }

            await context.SaveChangesAsync();
        }

        private static async Task SeedVerticals(ApplicationDbContext context)
        {
            var verticals = new[]
            {
                new Vertical
                {
                    Code = "barbershop",
                    Name = "Barberías",
                    Description = "Gestión de turnos para barberías",
                    Domain = "turnos-pro.com",
                    DefaultTheme = JsonSerializer.Serialize(new
                    {
                        PrimaryColor = "#000000",      // Negro puro
                        SecondaryColor = "#FFFFFF",     // Blanco
                        AccentColor = "#333333",        // Gris oscuro
                        BackgroundGradient = "linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 50%, #E9ECEF 100%)",
                        FontFamily = "Roboto"
                    }),
                    DefaultServices = JsonSerializer.Serialize(new[]
                    {
                        new { Name = "Corte de Cabello", DurationMinutes = 30, Price = 15.00 },
                        new { Name = "Barba", DurationMinutes = 20, Price = 10.00 },
                        new { Name = "Corte + Barba", DurationMinutes = 45, Price = 22.00 }
                    }),
                    Terminology = JsonSerializer.Serialize(new Dictionary<string, string>
                    {
                        ["professional"] = "Barbero",
                        ["customer"] = "Cliente",
                        ["service"] = "Servicio",
                        ["booking"] = "Turno"
                    }),
                    Features = JsonSerializer.Serialize(new Dictionary<string, bool>
                    {
                        ["onlinePayment"] = true,
                        ["smsReminders"] = true,
                        ["loyaltyProgram"] = false,
                        ["multiLocation"] = false
                    })
                },
                new Vertical
                {
                    Code = "peluqueria",
                    Name = "Peluquerías",
                    Description = "Gestión de citas para peluquerías",
                    Domain = "turnos-pro.com",
                    DefaultTheme = JsonSerializer.Serialize(new
                    {
                        PrimaryColor = "#C8A2C8",       // Rosa polvoso/malva
                        SecondaryColor = "#FFF8F0",     // Blanco crema
                        AccentColor = "#E6C9A8",        // Dorado rosa/champagne
                        BackgroundGradient = "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 50%, #FAF0E6 100%)",
                        FontFamily = "Playfair Display"
                    }),
                    DefaultServices = JsonSerializer.Serialize(new[]
                    {
                        new { Name = "Corte y Peinado", DurationMinutes = 60, Price = 35.00 },
                        new { Name = "Coloración", DurationMinutes = 120, Price = 80.00 },
                        new { Name = "Tratamiento Capilar", DurationMinutes = 45, Price = 25.00 }
                    }),
                    Terminology = JsonSerializer.Serialize(new Dictionary<string, string>
                    {
                        ["professional"] = "Estilista",
                        ["customer"] = "Cliente",
                        ["service"] = "Servicio",
                        ["booking"] = "Cita"
                    }),
                    Features = JsonSerializer.Serialize(new Dictionary<string, bool>
                    {
                        ["onlinePayment"] = true,
                        ["smsReminders"] = true,
                        ["loyaltyProgram"] = true,
                        ["multiLocation"] = true
                    })
                },
                new Vertical
                {
                    Code = "aesthetics",
                    Name = "Centros de Estética", 
                    Description = "Gestión de citas para centros estéticos",
                    Domain = "turnos-pro.com",
                    DefaultTheme = JsonSerializer.Serialize(new
                    {
                        PrimaryColor = "#87CEEB",       // Azul claro/celeste
                        SecondaryColor = "#FFFFFF",     // Blanco puro
                        AccentColor = "#98FF98",        // Verde menta
                        BackgroundGradient = "linear-gradient(135deg, #FFFFFF 0%, #F0F8FF 50%, #E6F3FF 100%)",
                        FontFamily = "Lato"
                    }),
                    DefaultServices = JsonSerializer.Serialize(new[]
                    {
                        new { Name = "Limpieza Facial", DurationMinutes = 60, Price = 50.00 },
                        new { Name = "Masaje Relajante", DurationMinutes = 90, Price = 70.00 },
                        new { Name = "Depilación", DurationMinutes = 30, Price = 25.00 }
                    }),
                    Terminology = JsonSerializer.Serialize(new Dictionary<string, string>
                    {
                        ["professional"] = "Esteticista",
                        ["customer"] = "Cliente",
                        ["service"] = "Tratamiento",
                        ["booking"] = "Reserva"
                    }),
                    Features = JsonSerializer.Serialize(new Dictionary<string, bool>
                    {
                        ["onlinePayment"] = true,
                        ["smsReminders"] = true,
                        ["loyaltyProgram"] = true,
                        ["multiLocation"] = false
                    })
                },
                new Vertical
                {
                    Code = "nailsalon",
                    Name = "Salones de Uñas",
                    Description = "Gestión de citas para salones de uñas",
                    Domain = "turnos-pro.com",
                    DefaultTheme = JsonSerializer.Serialize(new
                    {
                        PrimaryColor = "#FF69B4",       // Rosa chicle/fucsia suave
                        SecondaryColor = "#FFFAFA",     // Blanco nieve
                        AccentColor = "#FF7F50",        // Coral vibrante
                        BackgroundGradient = "linear-gradient(135deg, #FFFFFF 0%, #FFF0F5 50%, #FFE4E1 100%)",
                        FontFamily = "Poppins"
                    }),
                    DefaultServices = JsonSerializer.Serialize(new[]
                    {
                        new { Name = "Manicura Básica", DurationMinutes = 30, Price = 25.00 },
                        new { Name = "Uñas Gel", DurationMinutes = 60, Price = 45.00 },
                        new { Name = "Diseño Nail Art", DurationMinutes = 90, Price = 65.00 },
                        new { Name = "Pedicura Spa", DurationMinutes = 45, Price = 35.00 }
                    }),
                    Terminology = JsonSerializer.Serialize(new Dictionary<string, string>
                    {
                        ["professional"] = "Nail Artist",
                        ["customer"] = "Cliente",
                        ["service"] = "Servicio",
                        ["booking"] = "Cita"
                    }),
                    Features = JsonSerializer.Serialize(new Dictionary<string, bool>
                    {
                        ["onlinePayment"] = true,
                        ["smsReminders"] = true,
                        ["loyaltyProgram"] = true,
                        ["multiLocation"] = false
                    })
                }
            };

            await context.Verticals.AddRangeAsync(verticals);
        }

        private static async Task SeedPlans(ApplicationDbContext context)
        {
            var verticals = await context.Verticals.ToListAsync();

            foreach (var vertical in verticals)
            {
                var plans = new[]
                {
                    new Plan
                    {
                        VerticalId = vertical.Id,
                        Name = "Plan Básico",
                        Code = "basic",
                        PriceMonthly = 29.99m,
                        PriceYearly = 299.99m,
                        Features = JsonSerializer.Serialize(new Dictionary<string, bool>
                        {
                            ["onlineBooking"] = true,
                            ["calendar"] = true,
                            ["customerManagement"] = true,
                            ["basicReports"] = true,
                            ["emailSupport"] = true
                        }),
                        Limits = JsonSerializer.Serialize(new Dictionary<string, int>
                        {
                            ["maxProfessionals"] = 3,
                            ["maxBookings"] = 500,
                            ["maxCustomers"] = 1000
                        })
                    },
                    new Plan
                    {
                        VerticalId = vertical.Id,
                        Name = "Plan Pro",
                        Code = "pro",
                        PriceMonthly = 59.99m,
                        PriceYearly = 599.99m,
                        Features = JsonSerializer.Serialize(new Dictionary<string, bool>
                        {
                            ["onlineBooking"] = true,
                            ["calendar"] = true,
                            ["customerManagement"] = true,
                            ["basicReports"] = true,
                            ["advancedReports"] = true,
                            ["smsNotifications"] = true,
                            ["onlinePayments"] = true,
                            ["prioritySupport"] = true
                        }),
                        Limits = JsonSerializer.Serialize(new Dictionary<string, int>
                        {
                            ["maxProfessionals"] = 10,
                            ["maxBookings"] = 2000,
                            ["maxCustomers"] = 5000
                        })
                    }
                };

                await context.Plans.AddRangeAsync(plans);
            }
        }
    }
}