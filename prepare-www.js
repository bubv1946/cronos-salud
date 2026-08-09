/**
 * Script utilitario para preparar la carpeta `www` requerida por Capacitor
 * Copia los archivos web limpios a la carpeta www para compilar en Android Studio
 */
const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');

if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// Copiar archivos maestros a la carpeta www
const filesToCopy = [
  { src: 'app.html', dest: 'index.html' },
  { src: 'app.html', dest: 'app.html' },
  { src: 'app_4.html', dest: 'app_4.html' },
  { src: 'index.html', dest: 'landing.html' },
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'icon-192.png', dest: 'icon-192.png' },
  { src: 'icon-512.png', dest: 'icon-512.png' },
  { src: 'sw.js', dest: 'sw.js' }
];

filesToCopy.forEach(item => {
  const srcPath = path.join(__dirname, item.src);
  const destPath = path.join(wwwDir, item.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ Copiado: ${item.src} -> www/${item.dest}`);
  }
});

console.log('¡Carpeta www preparada con éxito para Capacitor!');
