/* Encoge una foto en el navegador antes de subirla.
 *
 * Dos razones. Una función de Netlify no acepta más de 6 MB de cuerpo, y una
 * foto de celular moderna pasa de eso. Y aunque cupiera, subir 8 MB por datos
 * móviles desde la tienda es un minuto de espera para nada: el catálogo nunca
 * muestra la imagen a más de 1400 px de ancho.
 *
 * Se manda JPEG salvo que el original ya sea WebP. El CDN de imágenes se
 * encarga después de servirla en el formato que pida cada navegador.
 */

const LADO = 1600;      // algo de margen sobre los 1400 px del catálogo
const CALIDAD = 0.86;
export const PESO_MAXIMO = 25 * 1024 * 1024;   // antes de encoger

export const ACEPTA = "image/jpeg,image/png,image/webp";

export async function encoger(archivo) {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) {
    throw new Error("Solo JPG, PNG o WebP.");
  }
  if (archivo.size > PESO_MAXIMO) {
    throw new Error("Esa foto pesa demasiado. Elige otra o hazle una captura.");
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch (e) {
    throw new Error("No se pudo leer la foto. Puede estar dañada.");
  }

  const escala = Math.min(1, LADO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const cx = lienzo.getContext("2d");
  cx.drawImage(bitmap, 0, 0, ancho, alto);
  if (bitmap.close) bitmap.close();

  const tipo = archivo.type === "image/webp" ? "image/webp" : "image/jpeg";
  const trozo = await new Promise((ok) => lienzo.toBlob(ok, tipo, CALIDAD));
  if (!trozo) throw new Error("No se pudo preparar la foto.");

  // Si encoger la dejó más grande que el original (pasa con PNG planos), se
  // manda el original tal cual mientras quepa.
  if (trozo.size >= archivo.size && archivo.size <= 5 * 1024 * 1024) {
    return { trozo: archivo, tipo: archivo.type, ancho: bitmap.width, alto: bitmap.height };
  }
  return { trozo, tipo, ancho, alto };
}

export function pesoLegible(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
