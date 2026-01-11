export interface NewsItem {
    id: string;
    titulo: string;
    resumen: string;
    sentimiento: 'Positivo' | 'Negativo' | 'Neutro';
    empresas: string[];
    enlace: string;
    fecha: string;
    sentiment_score?: number;
    category?: 'Crypto' | 'Forex' | 'Stock';
}

export const mockNews: NewsItem[] = [
    {
        id: "1",
        titulo: "Descubrimiento en mercados financieros",
        sentimiento: "Positivo",
        resumen: "Físicos descubren regla universal que rige mercados financieros.",
        empresas: [],
        enlace: "#",
        fecha: "2024-01-15T10:00:00Z",
        sentiment_score: 0.85,
        category: "Stock"
    },
    {
        id: "2",
        titulo: "Crisis de Venezuela",
        sentimiento: "Negativo",
        resumen: "Crisis de Venezuela impacta globalmente mercados: petróleo y bonos.",
        empresas: ["PDVSA"],
        enlace: "#",
        fecha: "2024-01-14T15:30:00Z",
        sentiment_score: -0.65,
        category: "Forex"
    },
    {
        id: "3",
        titulo: "BCE mantiene tipos",
        sentimiento: "Neutro",
        resumen: "El BCE mantiene los tipos de interés sin cambios a la espera de nuevos datos de inflación.",
        empresas: ["BCE"],
        enlace: "#",
        fecha: "2024-01-13T09:00:00Z",
        sentiment_score: 0.12,
        category: "Forex"
    },
    {
        id: "4",
        titulo: "Inversión récord en IA",
        sentimiento: "Positivo",
        resumen: "Startups de IA reciben inversión récord en el último trimestre.",
        empresas: ["OpenAI", "Anthropic"],
        enlace: "#",
        fecha: "2024-01-12T11:20:00Z",
        sentiment_score: 0.92,
        category: "Stock"
    }
];
