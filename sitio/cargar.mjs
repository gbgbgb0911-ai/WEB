import { neon } from '/home/user/WEB/node_modules/@neondatabase/serverless/index.mjs';
import { readFile } from 'node:fs/promises';

const URL_BD = process.env.DATABASE_URL;
const sentencias = JSON.parse(await readFile('/tmp/semilla.json', 'utf8'));
const sql = neon(URL_BD);

let n = 0;
for (const s of sentencias) {
  const etiqueta = s.slice(0, 46).replace(/\s+/g, ' ');
  for (let intento = 1; intento <= 6; intento++) {
    try {
      await sql.query(s);
      n++;
      process.stdout.write(`[${n}/${sentencias.length}] ok  ${etiqueta}\n`);
      break;
    } catch (e) {
      const msg = String(e.message || e);
      if (intento === 6) {
        process.stdout.write(`[${n + 1}] FALLO  ${etiqueta}\n  ${msg}\n`);
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 500 * intento));
    }
  }
}

const [r] = await sql.query(`select
  (select count(*) from catalogo.categoria) as categorias,
  (select count(*) from catalogo.producto) as productos,
  (select count(*) from catalogo.producto where visible) as visibles,
  (select count(*) from catalogo.color) as colores,
  (select count(*) from catalogo.talla) as tallas,
  (select count(*) from catalogo.imagen) as imagenes`);
console.log('\nRESUMEN:', r);
