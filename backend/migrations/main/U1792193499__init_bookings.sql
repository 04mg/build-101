CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL
) STRICT;

CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    guests INTEGER NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
) STRICT;

INSERT INTO services (name, description, duration_min, price, category, image_url) VALUES
('Cancha de Pádel Pro (Cristal)', 'Cancha panorámica con iluminación LED profesional y césped texturado.', 90, 28.0, 'Deportes', 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&auto=format&fit=crop&q=80'),
('Sala Coworking / Directorio', 'Sala climatizada con pantalla 4K 75", pizarra acústica y videoconferencia.', 60, 45.0, 'Espacios', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80'),
('Mesa Chef Terraza Lounge', 'Mesa exclusiva para veladas gourmet con vista panorámica y atención personalizada.', 120, 20.0, 'Gastronomía', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'),
('Consultoría Estratégica 1:1', 'Sesión intensiva de arquitectura cloud, IA y aceleración digital.', 45, 95.0, 'Negocios', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80');
