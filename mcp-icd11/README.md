# MCP de ICD-11 (WHO API)

Servidor MCP con 2 herramientas sobre la API oficial de la OMS:

| Herramienta | Descripción |
|---|---|
| `icd11_search` | Busca en ICD-11 (linearización MMS) |
| `icd11_get_entity` | Detalle de entidad por código o id |

## Setup

```bash
cd mcp-icd11
npm install
cp .env.example .env   # completar credenciales WHO
npm run build
```

## Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "icd11": {
      "command": "node",
      "args": ["mcp-icd11/build/index.js"]
    }
  }
}
```

Las credenciales se leen de `mcp-icd11/.env` (no hace falta ponerlas en `mcp.json`).

## Claude Desktop

```json
{
  "mcpServers": {
    "icd11": {
      "command": "node",
      "args": ["/ruta/absoluta/a/Screening-intel/mcp-icd11/build/index.js"]
    }
  }
}
```
