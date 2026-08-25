import { SwaggerDocs } from "@/components/docs/SwaggerDocs";
import config from "@/config";

export const metadata = {
  title: `API · Swagger · ${config.app.name}`,
  description: "Documentación interactiva OpenAPI 3.0 de la REST API.",
};

export default function ApiDocsPage() {
  return <SwaggerDocs />;
}
