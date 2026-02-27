using System;
using System.Collections.Generic;

namespace BookingPro.API.Data
{
    public static class VerticalSeeders
    {
        public static class BarbershopSeeder
        {
            public static List<ServiceCategoryTemplate> GetCategories()
            {
                return new List<ServiceCategoryTemplate>
                {
                    new ServiceCategoryTemplate
                    {
                        Name = "Cortes",
                        Description = "Servicios de corte de cabello para caballeros",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Corte Clásico", Description = "Corte tradicional con tijera y máquina", DurationMinutes = 30, Price = 15000 },
                            new ServiceData { Name = "Corte + Barba", Description = "Corte de cabello y arreglo de barba completo", DurationMinutes = 45, Price = 20000 },
                            new ServiceData { Name = "Corte Premium", Description = "Corte con diseño personalizado y detallado", DurationMinutes = 45, Price = 25000 },
                            new ServiceData { Name = "Corte Niño", Description = "Corte para niños menores de 12 años", DurationMinutes = 25, Price = 12000 },
                            new ServiceData { Name = "Rapado", Description = "Corte al ras con máquina", DurationMinutes = 15, Price = 10000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Barba",
                        Description = "Servicios especializados de barba",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Arreglo de Barba", Description = "Perfilado y arreglo de barba", DurationMinutes = 20, Price = 8000 },
                            new ServiceData { Name = "Afeitado Clásico", Description = "Afeitado tradicional con navaja", DurationMinutes = 30, Price = 12000 },
                            new ServiceData { Name = "Diseño de Barba", Description = "Diseño personalizado y detallado de barba", DurationMinutes = 30, Price = 15000 },
                            new ServiceData { Name = "Tinte de Barba", Description = "Coloración profesional de barba", DurationMinutes = 30, Price = 18000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Tratamientos",
                        Description = "Tratamientos capilares especializados",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Lavado y Masaje", Description = "Lavado profundo con masaje capilar", DurationMinutes = 15, Price = 5000 },
                            new ServiceData { Name = "Tratamiento Anticaída", Description = "Tratamiento especializado para la caída del cabello", DurationMinutes = 45, Price = 35000 },
                            new ServiceData { Name = "Hidratación Profunda", Description = "Tratamiento hidratante para cabello y cuero cabelludo", DurationMinutes = 30, Price = 20000 },
                            new ServiceData { Name = "Exfoliación Capilar", Description = "Limpieza profunda del cuero cabelludo", DurationMinutes = 25, Price = 18000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Adicionales",
                        Description = "Servicios complementarios",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Cejas", Description = "Perfilado de cejas", DurationMinutes = 10, Price = 5000 },
                            new ServiceData { Name = "Depilación con Cera", Description = "Depilación facial con cera", DurationMinutes = 15, Price = 8000 },
                            new ServiceData { Name = "Mascarilla Negra", Description = "Mascarilla facial purificante", DurationMinutes = 20, Price = 12000 },
                            new ServiceData { Name = "Tinte de Cabello", Description = "Coloración completa del cabello", DurationMinutes = 60, Price = 40000 }
                        }
                    }
                };
            }
        }

        public static class BeautySalonSeeder
        {
            public static List<ServiceCategoryTemplate> GetCategories()
            {
                return new List<ServiceCategoryTemplate>
                {
                    new ServiceCategoryTemplate
                    {
                        Name = "Cortes y Peinados",
                        Description = "Servicios de corte y estilizado",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Corte de Dama", Description = "Corte personalizado para dama", DurationMinutes = 45, Price = 25000 },
                            new ServiceData { Name = "Corte + Brushing", Description = "Corte y secado profesional", DurationMinutes = 60, Price = 35000 },
                            new ServiceData { Name = "Peinado Social", Description = "Peinado para eventos especiales", DurationMinutes = 60, Price = 40000 },
                            new ServiceData { Name = "Peinado de Novia", Description = "Peinado profesional para novias", DurationMinutes = 120, Price = 120000 },
                            new ServiceData { Name = "Brushing", Description = "Secado y modelado profesional", DurationMinutes = 30, Price = 20000 },
                            new ServiceData { Name = "Planchado", Description = "Alisado temporal con plancha", DurationMinutes = 45, Price = 25000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Coloración",
                        Description = "Servicios de color y mechas",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Tinte Completo", Description = "Coloración total del cabello", DurationMinutes = 90, Price = 60000 },
                            new ServiceData { Name = "Retoque de Raíz", Description = "Retoque de crecimiento", DurationMinutes = 60, Price = 40000 },
                            new ServiceData { Name = "Mechas Californianas", Description = "Mechas degradadas estilo californiano", DurationMinutes = 150, Price = 120000 },
                            new ServiceData { Name = "Balayage", Description = "Técnica de mechas pintadas a mano", DurationMinutes = 180, Price = 150000 },
                            new ServiceData { Name = "Mechas con Papel", Description = "Mechas tradicionales con papel aluminio", DurationMinutes = 120, Price = 80000 },
                            new ServiceData { Name = "Decoloración", Description = "Decoloración completa del cabello", DurationMinutes = 120, Price = 90000 },
                            new ServiceData { Name = "Matización", Description = "Neutralización de tonos no deseados", DurationMinutes = 45, Price = 35000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Tratamientos Capilares",
                        Description = "Tratamientos especializados para el cabello",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Keratina", Description = "Tratamiento de alisado con keratina", DurationMinutes = 180, Price = 180000 },
                            new ServiceData { Name = "Botox Capilar", Description = "Tratamiento rejuvenecedor del cabello", DurationMinutes = 120, Price = 120000 },
                            new ServiceData { Name = "Hidratación Profunda", Description = "Tratamiento hidratante intensivo", DurationMinutes = 60, Price = 50000 },
                            new ServiceData { Name = "Nutrición Capilar", Description = "Tratamiento nutritivo para cabello dañado", DurationMinutes = 60, Price = 55000 },
                            new ServiceData { Name = "Cauterización", Description = "Sellado de cutículas capilares", DurationMinutes = 90, Price = 70000 },
                            new ServiceData { Name = "Tratamiento Olaplex", Description = "Reconstrucción molecular del cabello", DurationMinutes = 45, Price = 60000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Manicura y Pedicura",
                        Description = "Servicios de cuidado de manos y pies",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Manicura Clásica", Description = "Manicura tradicional con esmaltado", DurationMinutes = 45, Price = 20000 },
                            new ServiceData { Name = "Manicura Francesa", Description = "Manicura estilo francés", DurationMinutes = 50, Price = 25000 },
                            new ServiceData { Name = "Manicura Rusa", Description = "Manicura detallada con técnica rusa", DurationMinutes = 60, Price = 35000 },
                            new ServiceData { Name = "Pedicura Clásica", Description = "Pedicura completa con esmaltado", DurationMinutes = 60, Price = 30000 },
                            new ServiceData { Name = "Pedicura Spa", Description = "Pedicura con tratamiento spa", DurationMinutes = 90, Price = 45000 },
                            new ServiceData { Name = "Uñas Gel", Description = "Aplicación de esmalte en gel", DurationMinutes = 60, Price = 40000 },
                            new ServiceData { Name = "Uñas Acrílicas", Description = "Extensión con uñas acrílicas", DurationMinutes = 90, Price = 50000 },
                            new ServiceData { Name = "Diseño de Uñas", Description = "Arte y diseño personalizado en uñas", DurationMinutes = 30, Price = 15000 },
                            new ServiceData { Name = "Retiro de Esmalte Gel", Description = "Remoción profesional de gel", DurationMinutes = 20, Price = 10000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Depilación",
                        Description = "Servicios de depilación",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Depilación Cejas", Description = "Diseño y depilación de cejas", DurationMinutes = 15, Price = 8000 },
                            new ServiceData { Name = "Depilación Bozo", Description = "Depilación del labio superior", DurationMinutes = 10, Price = 6000 },
                            new ServiceData { Name = "Depilación Axilas", Description = "Depilación completa de axilas", DurationMinutes = 15, Price = 12000 },
                            new ServiceData { Name = "Depilación Piernas Completas", Description = "Depilación total de piernas", DurationMinutes = 45, Price = 35000 },
                            new ServiceData { Name = "Depilación Media Pierna", Description = "Depilación hasta la rodilla", DurationMinutes = 25, Price = 20000 },
                            new ServiceData { Name = "Depilación Brasileña", Description = "Depilación zona bikini completa", DurationMinutes = 30, Price = 30000 }
                        }
                    }
                };
            }
        }

        public static class AestheticsSeeder
        {
            public static List<ServiceCategoryTemplate> GetCategories()
            {
                return new List<ServiceCategoryTemplate>
                {
                    new ServiceCategoryTemplate
                    {
                        Name = "Tratamientos Faciales",
                        Description = "Tratamientos especializados para el rostro",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Limpieza Facial Profunda", Description = "Limpieza profunda con extracción", DurationMinutes = 60, Price = 60000 },
                            new ServiceData { Name = "Hidratación Facial", Description = "Tratamiento hidratante intensivo", DurationMinutes = 45, Price = 45000 },
                            new ServiceData { Name = "Peeling Químico", Description = "Exfoliación química profesional", DurationMinutes = 45, Price = 80000 },
                            new ServiceData { Name = "Microdermoabrasión", Description = "Exfoliación con punta de diamante", DurationMinutes = 60, Price = 90000 },
                            new ServiceData { Name = "Radiofrecuencia Facial", Description = "Tratamiento tensor con radiofrecuencia", DurationMinutes = 60, Price = 100000 },
                            new ServiceData { Name = "Mesoterapia Facial", Description = "Aplicación de vitaminas y nutrientes", DurationMinutes = 45, Price = 120000 },
                            new ServiceData { Name = "Plasma Rico en Plaquetas", Description = "PRP para rejuvenecimiento facial", DurationMinutes = 90, Price = 250000 },
                            new ServiceData { Name = "Botox", Description = "Aplicación de toxina botulínica", DurationMinutes = 30, Price = 180000 },
                            new ServiceData { Name = "Ácido Hialurónico", Description = "Relleno con ácido hialurónico", DurationMinutes = 45, Price = 200000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Tratamientos Corporales",
                        Description = "Tratamientos para el cuerpo",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Masaje Relajante", Description = "Masaje corporal completo relajante", DurationMinutes = 60, Price = 70000 },
                            new ServiceData { Name = "Masaje Descontracturante", Description = "Masaje terapéutico profundo", DurationMinutes = 60, Price = 80000 },
                            new ServiceData { Name = "Drenaje Linfático", Description = "Masaje de drenaje linfático manual", DurationMinutes = 60, Price = 75000 },
                            new ServiceData { Name = "Masaje con Piedras Calientes", Description = "Terapia con piedras volcánicas", DurationMinutes = 90, Price = 120000 },
                            new ServiceData { Name = "Envolturas Corporales", Description = "Tratamiento con algas o barro", DurationMinutes = 90, Price = 100000 },
                            new ServiceData { Name = "Exfoliación Corporal", Description = "Peeling corporal completo", DurationMinutes = 45, Price = 60000 },
                            new ServiceData { Name = "Presoterapia", Description = "Tratamiento de compresión para circulación", DurationMinutes = 45, Price = 50000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Reducción y Modelado",
                        Description = "Tratamientos reductores y modeladores",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Cavitación", Description = "Reducción de grasa localizada", DurationMinutes = 45, Price = 80000 },
                            new ServiceData { Name = "Radiofrecuencia Corporal", Description = "Tratamiento tensor corporal", DurationMinutes = 60, Price = 90000 },
                            new ServiceData { Name = "Criolipólisis", Description = "Congelación de células grasas", DurationMinutes = 60, Price = 150000 },
                            new ServiceData { Name = "Electroestimulación", Description = "Tonificación muscular con electrodos", DurationMinutes = 45, Price = 60000 },
                            new ServiceData { Name = "Mesoterapia Corporal", Description = "Inyecciones para reducción localizada", DurationMinutes = 45, Price = 100000 },
                            new ServiceData { Name = "Carboxiterapia", Description = "Aplicación de CO2 para celulitis", DurationMinutes = 45, Price = 90000 },
                            new ServiceData { Name = "Velashape", Description = "Tratamiento combinado para modelado", DurationMinutes = 60, Price = 120000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Depilación Definitiva",
                        Description = "Servicios de depilación láser",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Láser Axilas", Description = "Depilación láser de axilas", DurationMinutes = 20, Price = 40000 },
                            new ServiceData { Name = "Láser Piernas Completas", Description = "Depilación láser piernas enteras", DurationMinutes = 60, Price = 150000 },
                            new ServiceData { Name = "Láser Brasileña", Description = "Depilación láser zona íntima", DurationMinutes = 30, Price = 80000 },
                            new ServiceData { Name = "Láser Rostro Completo", Description = "Depilación láser facial completa", DurationMinutes = 30, Price = 60000 },
                            new ServiceData { Name = "Láser Espalda", Description = "Depilación láser de espalda", DurationMinutes = 45, Price = 120000 },
                            new ServiceData { Name = "IPL Cuerpo Completo", Description = "Sesión completa de luz pulsada", DurationMinutes = 120, Price = 350000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Medicina Estética",
                        Description = "Procedimientos médico-estéticos",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Hilos Tensores", Description = "Lifting con hilos reabsorbibles", DurationMinutes = 60, Price = 300000 },
                            new ServiceData { Name = "Peeling TCA", Description = "Peeling profundo con ácido", DurationMinutes = 45, Price = 150000 },
                            new ServiceData { Name = "Escleroterapia", Description = "Tratamiento de várices", DurationMinutes = 45, Price = 120000 },
                            new ServiceData { Name = "Rinomodelación", Description = "Modelado de nariz sin cirugía", DurationMinutes = 45, Price = 250000 },
                            new ServiceData { Name = "Bichectomía Enzimática", Description = "Reducción de cachetes sin cirugía", DurationMinutes = 30, Price = 200000 }
                        }
                    }
                };
            }
        }

        public static class NailSalonSeeder
        {
            public static List<ServiceCategoryTemplate> GetCategories()
            {
                return new List<ServiceCategoryTemplate>
                {
                    new ServiceCategoryTemplate
                    {
                        Name = "Manicura",
                        Description = "Servicios de manicura",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Manicura Clásica", Description = "Limado, cutículas y esmaltado", DurationMinutes = 45, Price = 20000 },
                            new ServiceData { Name = "Manicura Francesa", Description = "Estilo francés elegante", DurationMinutes = 50, Price = 25000 },
                            new ServiceData { Name = "Manicura Rusa", Description = "Técnica rusa detallada", DurationMinutes = 60, Price = 35000 },
                            new ServiceData { Name = "Esmaltado Semipermanente", Description = "Esmalte gel de larga duración", DurationMinutes = 60, Price = 30000 },
                            new ServiceData { Name = "Retiro de Semipermanente", Description = "Remoción profesional", DurationMinutes = 20, Price = 10000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Uñas Esculpidas",
                        Description = "Extensiones y esculpido de uñas",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Uñas Acrílicas", Description = "Extensión con acrílico", DurationMinutes = 90, Price = 50000 },
                            new ServiceData { Name = "Uñas de Gel", Description = "Extensión con gel", DurationMinutes = 90, Price = 45000 },
                            new ServiceData { Name = "Uñas Poligel", Description = "Técnica híbrida poligel", DurationMinutes = 80, Price = 48000 },
                            new ServiceData { Name = "Relleno Acrílico", Description = "Mantenimiento de uñas acrílicas", DurationMinutes = 60, Price = 35000 },
                            new ServiceData { Name = "Relleno Gel", Description = "Mantenimiento de uñas de gel", DurationMinutes = 60, Price = 32000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Nail Art",
                        Description = "Diseños y decoraciones",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Diseño Simple", Description = "Decoración básica por uña", DurationMinutes = 30, Price = 15000 },
                            new ServiceData { Name = "Diseño Complejo", Description = "Arte detallado por uña", DurationMinutes = 60, Price = 30000 },
                            new ServiceData { Name = "Encapsulado", Description = "Diseño encapsulado en gel", DurationMinutes = 90, Price = 55000 },
                            new ServiceData { Name = "Piedras y Accesorios", Description = "Aplicación de cristales y detalles", DurationMinutes = 30, Price = 20000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Pedicura",
                        Description = "Servicios de pedicura",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Pedicura Clásica", Description = "Pedicura completa con esmaltado", DurationMinutes = 60, Price = 30000 },
                            new ServiceData { Name = "Pedicura Spa", Description = "Pedicura con tratamiento relajante", DurationMinutes = 90, Price = 45000 },
                            new ServiceData { Name = "Pedicura Express", Description = "Esmaltado rápido de pies", DurationMinutes = 30, Price = 18000 }
                        }
                    }
                };
            }
        }

        public static class CarWashSeeder
        {
            public static List<ServiceCategoryTemplate> GetCategories()
            {
                return new List<ServiceCategoryTemplate>
                {
                    new ServiceCategoryTemplate
                    {
                        Name = "Lavado",
                        Description = "Servicios de lavado de vehículos",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Lavado Exterior", Description = "Lavado exterior completo con secado", DurationMinutes = 30, Price = 15000 },
                            new ServiceData { Name = "Lavado Completo", Description = "Lavado exterior e interior del vehículo", DurationMinutes = 60, Price = 25000 },
                            new ServiceData { Name = "Lavado Premium", Description = "Lavado completo con cera y abrillantado", DurationMinutes = 90, Price = 40000 },
                            new ServiceData { Name = "Lavado de Motor", Description = "Limpieza profunda del compartimento motor", DurationMinutes = 45, Price = 20000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Detailing",
                        Description = "Servicios de detallado profesional",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Encerado", Description = "Aplicación de cera protectora", DurationMinutes = 60, Price = 30000 },
                            new ServiceData { Name = "Pulido", Description = "Pulido de pintura para eliminar rayaduras", DurationMinutes = 120, Price = 60000 },
                            new ServiceData { Name = "Detailing Completo", Description = "Tratamiento integral de pintura y acabados", DurationMinutes = 180, Price = 100000 },
                            new ServiceData { Name = "Ceramic Coating", Description = "Protección cerámica de larga duración", DurationMinutes = 240, Price = 180000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Interior",
                        Description = "Servicios de limpieza interior",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Aspirado Interior", Description = "Aspirado completo del habitáculo", DurationMinutes = 30, Price = 12000 },
                            new ServiceData { Name = "Limpieza de Tapizados", Description = "Limpieza profunda de asientos y alfombras", DurationMinutes = 90, Price = 45000 },
                            new ServiceData { Name = "Limpieza de Cuero", Description = "Tratamiento e hidratación de cuero", DurationMinutes = 60, Price = 35000 },
                            new ServiceData { Name = "Sanitización", Description = "Desinfección y eliminación de olores", DurationMinutes = 30, Price = 18000 }
                        }
                    }
                };
            }
        }

        public static class DepilationSeeder
        {
            public static List<ServiceCategoryTemplate> GetCategories()
            {
                return new List<ServiceCategoryTemplate>
                {
                    new ServiceCategoryTemplate
                    {
                        Name = "Depilación con Cera",
                        Description = "Depilación tradicional con cera",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Piernas Completas", Description = "Depilación total de piernas con cera", DurationMinutes = 45, Price = 35000 },
                            new ServiceData { Name = "Media Pierna", Description = "Depilación hasta la rodilla", DurationMinutes = 25, Price = 20000 },
                            new ServiceData { Name = "Axilas", Description = "Depilación de axilas con cera", DurationMinutes = 15, Price = 12000 },
                            new ServiceData { Name = "Bikini", Description = "Depilación zona bikini", DurationMinutes = 20, Price = 18000 },
                            new ServiceData { Name = "Brasileño", Description = "Depilación brasileña completa", DurationMinutes = 30, Price = 30000 },
                            new ServiceData { Name = "Facial", Description = "Depilación de bozo, mentón y patillas", DurationMinutes = 15, Price = 10000 },
                            new ServiceData { Name = "Cuerpo Completo", Description = "Depilación total del cuerpo", DurationMinutes = 120, Price = 90000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Depilación Láser",
                        Description = "Depilación definitiva con láser",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Láser Axilas", Description = "Sesión de láser axilas", DurationMinutes = 20, Price = 40000 },
                            new ServiceData { Name = "Láser Piernas", Description = "Sesión de láser piernas completas", DurationMinutes = 60, Price = 120000 },
                            new ServiceData { Name = "Láser Bikini", Description = "Sesión de láser zona bikini", DurationMinutes = 30, Price = 60000 },
                            new ServiceData { Name = "Láser Brasileño", Description = "Sesión de láser brasileño completo", DurationMinutes = 30, Price = 80000 },
                            new ServiceData { Name = "Láser Facial", Description = "Sesión de láser rostro", DurationMinutes = 20, Price = 50000 },
                            new ServiceData { Name = "Láser Cuerpo Completo", Description = "Sesión de láser cuerpo entero", DurationMinutes = 120, Price = 300000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Tratamientos Post-depilación",
                        Description = "Cuidados después de la depilación",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Hidratación Post-depilación", Description = "Crema hidratante calmante", DurationMinutes = 15, Price = 8000 },
                            new ServiceData { Name = "Exfoliación Pre-depilación", Description = "Preparación de la piel antes del tratamiento", DurationMinutes = 20, Price = 12000 }
                        }
                    }
                };
            }
        }

        public static class SportsSeeder
        {
            public static List<ServiceCategoryTemplate> GetCategories()
            {
                return new List<ServiceCategoryTemplate>
                {
                    new ServiceCategoryTemplate
                    {
                        Name = "Fútbol",
                        Description = "Alquiler de canchas de fútbol",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Fútbol 5", Description = "Cancha de fútbol 5 (1 hora)", DurationMinutes = 60, Price = 50000 },
                            new ServiceData { Name = "Fútbol 7", Description = "Cancha de fútbol 7 (1 hora)", DurationMinutes = 60, Price = 70000 },
                            new ServiceData { Name = "Fútbol 11", Description = "Cancha de fútbol 11 (1.5 horas)", DurationMinutes = 90, Price = 120000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Pádel y Tenis",
                        Description = "Alquiler de canchas de pádel y tenis",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Pádel", Description = "Cancha de pádel (1 hora)", DurationMinutes = 60, Price = 40000 },
                            new ServiceData { Name = "Tenis", Description = "Cancha de tenis (1 hora)", DurationMinutes = 60, Price = 45000 },
                            new ServiceData { Name = "Pádel con Iluminación", Description = "Cancha de pádel nocturna (1 hora)", DurationMinutes = 60, Price = 50000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Otros Deportes",
                        Description = "Otros espacios deportivos",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Básquet", Description = "Cancha de básquet (1 hora)", DurationMinutes = 60, Price = 55000 },
                            new ServiceData { Name = "Vóley", Description = "Cancha de vóley (1 hora)", DurationMinutes = 60, Price = 40000 },
                            new ServiceData { Name = "Squash", Description = "Cancha de squash (1 hora)", DurationMinutes = 60, Price = 35000 }
                        }
                    }
                };
            }
        }

        public static class ConsultingSeeder
        {
            public static List<ServiceCategoryTemplate> GetCategories()
            {
                return new List<ServiceCategoryTemplate>
                {
                    new ServiceCategoryTemplate
                    {
                        Name = "Consulta Psicológica",
                        Description = "Servicios de psicología y terapia",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Sesión Individual", Description = "Sesión de terapia individual (50 min)", DurationMinutes = 50, Price = 45000 },
                            new ServiceData { Name = "Sesión de Pareja", Description = "Terapia de pareja (60 min)", DurationMinutes = 60, Price = 65000 },
                            new ServiceData { Name = "Sesión Familiar", Description = "Terapia familiar (60 min)", DurationMinutes = 60, Price = 70000 },
                            new ServiceData { Name = "Primera Consulta", Description = "Evaluación inicial y diagnóstico", DurationMinutes = 60, Price = 50000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Evaluaciones",
                        Description = "Evaluaciones y diagnósticos especializados",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Evaluación Psicodiagnóstica", Description = "Batería de tests y evaluación completa", DurationMinutes = 90, Price = 80000 },
                            new ServiceData { Name = "Evaluación Neuropsicológica", Description = "Evaluación de funciones cognitivas", DurationMinutes = 120, Price = 100000 },
                            new ServiceData { Name = "Informe Psicológico", Description = "Elaboración de informe profesional", DurationMinutes = 60, Price = 60000 }
                        }
                    },
                    new ServiceCategoryTemplate
                    {
                        Name = "Seguimiento",
                        Description = "Sesiones de seguimiento y control",
                        Services = new List<ServiceData>
                        {
                            new ServiceData { Name = "Sesión de Seguimiento", Description = "Control y seguimiento del tratamiento", DurationMinutes = 40, Price = 40000 },
                            new ServiceData { Name = "Sesión Online", Description = "Consulta por videollamada", DurationMinutes = 50, Price = 40000 },
                            new ServiceData { Name = "Supervisión Profesional", Description = "Supervisión para colegas", DurationMinutes = 60, Price = 55000 }
                        }
                    }
                };
            }
        }

        public static List<ProfessionalData> GetBarbershopProfessionals()
        {
            return new List<ProfessionalData>
            {
                new ProfessionalData { Name = "Carlos Rodríguez", Email = "carlos@barbershop.com", Phone = "1122334455" },
                new ProfessionalData { Name = "Miguel Fernández", Email = "miguel@barbershop.com", Phone = "1122334456" },
                new ProfessionalData { Name = "Roberto Silva", Email = "roberto@barbershop.com", Phone = "1122334457" },
                new ProfessionalData { Name = "Juan Martínez", Email = "juan@barbershop.com", Phone = "1122334458" }
            };
        }

        public static List<ProfessionalData> GetBeautySalonProfessionals()
        {
            return new List<ProfessionalData>
            {
                new ProfessionalData { Name = "María González", Email = "maria@peluqueria.com", Phone = "1133445566" },
                new ProfessionalData { Name = "Laura Pérez", Email = "laura@peluqueria.com", Phone = "1133445567" },
                new ProfessionalData { Name = "Ana López", Email = "ana@peluqueria.com", Phone = "1133445568" },
                new ProfessionalData { Name = "Carmen Díaz", Email = "carmen@peluqueria.com", Phone = "1133445569" },
                new ProfessionalData { Name = "Sofia Ruiz", Email = "sofia@peluqueria.com", Phone = "1133445570" }
            };
        }

        public static List<ProfessionalData> GetAestheticsProfessionals()
        {
            return new List<ProfessionalData>
            {
                new ProfessionalData { Name = "Dra. Patricia Morales", Email = "patricia@aesthetics.com", Phone = "1144556677" },
                new ProfessionalData { Name = "Lic. Valentina Torres", Email = "valentina@aesthetics.com", Phone = "1144556678" },
                new ProfessionalData { Name = "Lic. Gabriela Sánchez", Email = "gabriela@aesthetics.com", Phone = "1144556679" },
                new ProfessionalData { Name = "Téc. Lucía Romero", Email = "lucia@aesthetics.com", Phone = "1144556680" },
                new ProfessionalData { Name = "Dr. Andrés Vargas", Email = "andres@aesthetics.com", Phone = "1144556681" }
            };
        }

        public static List<ProfessionalData> GetNailSalonProfessionals()
        {
            return new List<ProfessionalData>
            {
                new ProfessionalData { Name = "Camila Herrera", Email = "camila@nailsalon.com", Phone = "1155667788" },
                new ProfessionalData { Name = "Luciana Paz", Email = "luciana@nailsalon.com", Phone = "1155667789" },
                new ProfessionalData { Name = "Valentina Ríos", Email = "valentina@nailsalon.com", Phone = "1155667790" },
                new ProfessionalData { Name = "Martina Castro", Email = "martina@nailsalon.com", Phone = "1155667791" }
            };
        }

        public static List<ProfessionalData> GetCarWashProfessionals()
        {
            return new List<ProfessionalData>
            {
                new ProfessionalData { Name = "Martín Aguirre", Email = "martin@carwash.com", Phone = "1166778899" },
                new ProfessionalData { Name = "Diego Romero", Email = "diego@carwash.com", Phone = "1166778900" },
                new ProfessionalData { Name = "Nicolás Vega", Email = "nicolas@carwash.com", Phone = "1166778901" },
                new ProfessionalData { Name = "Fernando Rivas", Email = "fernando@carwash.com", Phone = "1166778902" }
            };
        }

        public static List<ProfessionalData> GetDepilationProfessionals()
        {
            return new List<ProfessionalData>
            {
                new ProfessionalData { Name = "Carolina Méndez", Email = "carolina@depilacion.com", Phone = "1177889900" },
                new ProfessionalData { Name = "Andrea Suárez", Email = "andrea@depilacion.com", Phone = "1177889901" },
                new ProfessionalData { Name = "Florencia Ortiz", Email = "florencia@depilacion.com", Phone = "1177889902" },
                new ProfessionalData { Name = "Paula Giménez", Email = "paula@depilacion.com", Phone = "1177889903" }
            };
        }

        public static List<ProfessionalData> GetSportsProfessionals()
        {
            return new List<ProfessionalData>
            {
                new ProfessionalData { Name = "Cancha 1", Email = "cancha1@deportes.com", Phone = "1188990011" },
                new ProfessionalData { Name = "Cancha 2", Email = "cancha2@deportes.com", Phone = "1188990012" },
                new ProfessionalData { Name = "Cancha 3", Email = "cancha3@deportes.com", Phone = "1188990013" },
                new ProfessionalData { Name = "Cancha 4", Email = "cancha4@deportes.com", Phone = "1188990014" }
            };
        }

        public static List<ProfessionalData> GetConsultingProfessionals()
        {
            return new List<ProfessionalData>
            {
                new ProfessionalData { Name = "Lic. María Fernández", Email = "maria@consultorio.com", Phone = "1199001122" },
                new ProfessionalData { Name = "Lic. Juan Peralta", Email = "juan@consultorio.com", Phone = "1199001123" },
                new ProfessionalData { Name = "Dra. Laura Molina", Email = "laura@consultorio.com", Phone = "1199001124" },
                new ProfessionalData { Name = "Lic. Sebastián Díaz", Email = "sebastian@consultorio.com", Phone = "1199001125" }
            };
        }
    }

    public class ServiceCategoryTemplate
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<ServiceData> Services { get; set; } = new List<ServiceData>();
    }

    public class ServiceData
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public decimal Price { get; set; }
    }

    public class ProfessionalData
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string[] Specialties { get; set; } = Array.Empty<string>();
    }
}