import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'DevLead MCP - Programming Lead AI System',
    description: 'Autonomous AI Programming Lead with MCP delegation',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
