import "@/styles/theme.scss";

export const metadata = {
  title: "Transparência Guaçu · as contas de Mogi Guaçu explicadas",
  description:
    "As contas da Prefeitura de Mogi Guaçu (SP) em linguagem simples: quanto arrecada, como gasta, quanto deve e se o caixa fecha, a partir dos dados oficiais do Tesouro Nacional e do TCE-SP.",
  icons: { icon: "/favicon.svg" },
};

export const viewport = { themeColor: "#1a4f8b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-light">{children}</body>
    </html>
  );
}
