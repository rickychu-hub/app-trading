export interface NewsItem {
    sentimiento: "Positivo" | "Negativo" | "Neutro";
    resumen: string;
    empresas: string[];
}

export const mockNews: NewsItem[] = [
    {
        sentimiento: "Positivo",
        resumen: "Físicos descubren regla universal que rige mercados financieros.",
        empresas: []
    },
    {
        sentimiento: "Negativo",
        resumen: "Crisis de Venezuela impacta globalmente mercados: petróleo y bonos.",
        empresas: ["PDVSA"]
    },
    {
        sentimiento: "Neutro",
        resumen: "El BCE mantiene los tipos de interés sin cambios a la espera de nuevos datos de inflación.",
        empresas: ["BCE"]
    },
    {
        sentimiento: "Positivo",
        resumen: "Startups de IA reciben inversión récord en el último trimestre.",
        empresas: ["OpenAI", "Anthropic"]
    }
];
