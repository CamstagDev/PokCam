// Guardar y abrir archivos desde el juego, con lo que da el navegador (que
// también usan Electron y la vista web de Android).

export function descargar(nombre: string, texto: string): void {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Abre el selector de archivos y entrega el texto del elegido. La entrada
// queda en la página mientras el selector está abierto: suelta, el
// navegador puede descartarla antes de avisar qué archivo se eligió.
export function abrirArchivo(alAbrir: (texto: string) => void): void {
  document.querySelector('input[data-pokcam-archivo]')?.remove();
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = '.json,application/json';
  entrada.dataset.pokcamArchivo = '';
  entrada.style.display = 'none';
  entrada.addEventListener('change', () => {
    const archivo = entrada.files?.[0];
    entrada.remove();
    if (archivo) void archivo.text().then(alAbrir);
  });
  document.body.append(entrada);
  entrada.click();
}
