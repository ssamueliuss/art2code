document.getElementById('convertButton').addEventListener('click', async () => {
    const imageUrl = document.getElementById('imageUrl').value;
    const imageFile = document.getElementById('imageFile').files[0];
    const quality = document.getElementById('quality').value;
    const colorMode = document.querySelector('input[name="colorMode"]:checked').value;
    const invertColors = document.getElementById('invertColors').checked;
    const charSet = document.getElementById('charSet').value;

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
            processImage(event.target.result, quality, colorMode, invertColors, charSet);
            enableDownloadButtons(); // HABILITAR LOS BOTONES DE DESCARGA
        };
        reader.readAsDataURL(imageFile);
    } else if (imageUrl) {
        try {
            // ESTO NO FUNCIONA AÚN, PERO LO DEJO POR SI QUIERO HACERLO MÁS TARDE
            const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${imageUrl}`;
            await processImage(corsProxyUrl, quality, colorMode, invertColors, charSet);
            enableDownloadButtons(); // HABILITAR LOS BOTONES DE DESCARGA
        } catch (error) {
            alert('Error al cargar la imagen. Asegúrate que la URL sea válida y permita CORS.');
            console.error(error);
        }
    } else {
        alert('Por favor, selecciona una imagen o ingresa una URL.');
    }
});

// FUNCIONES PARA HABILITAR LOS BOTONES DE DESCARGA
function enableDownloadButtons() {
    document.getElementById('downloadTxtButton').disabled = false;
    document.getElementById('downloadImgButton').disabled = false;
}

// EVENTOS DE DESCARGA
document.getElementById('downloadTxtButton').addEventListener('click', downloadAsText);
document.getElementById('downloadImgButton').addEventListener('click', downloadAsImage);

function processImage(imageSrc, quality, colorMode, invertColors, charSet) {
    const canvas = document.getElementById('asciiCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // FUNCIÓN PARA CARGAR IMÁGENES CON CORS (NO FUNCIONA AUN)
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
        // AJUSTAR TAMAÑO DEL CANVAS
        const maxDimension = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxDimension) {
                height *= maxDimension / width;
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width *= maxDimension / height;
                height = maxDimension;
            }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const asciiArt = generateAscii(imageData, quality, colorMode, invertColors, charSet);

        // MOSTRAR EL ARTE ASCII EN UN ELEMENTO DE TEXTO
        const outputElement = document.getElementById('asciiOutput');
        outputElement.textContent = asciiArt;
        outputElement.style.fontFamily = 'monospace';
        outputElement.style.whiteSpace = 'pre';
        outputElement.style.lineHeight = '0.8';

        // OPCIONAL: MOSTRAR INFORMACIÓN DE CONVERSIÓN
        document.getElementById('conversionInfo').textContent =
            `Tamaño original: ${img.width}x${img.height} | ` +
            `Tamaño ASCII: ${Math.floor(width / stepX)}x${Math.floor(height / stepY)} caracteres`;
    };

    img.onerror = () => {
        alert('Error al cargar la imagen. La URL puede no ser válida o no permitir CORS.');
    };

    img.src = imageSrc;
}

function generateAscii(imageData, quality, colorMode, invertColors, charSet) {
    const { data, width, height } = imageData;
    
    // CARACTERES ASCII POR TIPO SELECCIONADO
    const charSets = {
        standard: ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'],
        blocks: ['█', '▓', '▒', '░', ' '],
        detailed: ['@', '#', '$', '%', '&', '?', '*', '+', ';', ':', ',', '.', ' '],
        simple: ['#', '.', ' '],
        reverse: [' ', '.', ',', ':', ';', '+', '*', '?', '%', 'S', '#', '@']
    };
    
    // SELECCIONAR EL JUEGO DE CARACTERES
    const asciiChars = charSets[charSet] || charSets.standard;
    
    // VARIABLES PARA EL PASO DE ESCALADO
    let stepX, stepY;
    
    // AJUSTAR RESOLUCIÓN SEGÚN CALIDAD
    switch (quality) {
        case 'high':
            stepX = 2;
            break;
        case 'medium':
            stepX = 4;
            break;
        case 'low':
            stepX = 8;
            break;
        case 'custom':
            stepX = parseInt(document.getElementById('customQuality').value) || 5;
            break;
        default:
            stepX = 4;
    }
    stepY = stepX * 2.2;  // COMPENSAR POR LA ALTURA DE LOS CARACTERES

    let asciiArt = '';
    let colorInfo = [];

    // GENERAR ARTE ASCII
    for (let y = 0; y < height; y += stepY) {
        for (let x = 0; x < width; x += stepX) {
            const pixelIdx = (Math.floor(y) * width + Math.floor(x)) * 4;
            const r = data[pixelIdx];
            const g = data[pixelIdx + 1];
            const b = data[pixelIdx + 2];
            const a = data[pixelIdx + 3] / 255;

            // CALCULAR BRILLO DEPENDIENDO DEL MODO DE COLOR
            let brightness;
            if (colorMode === 'color') {
                // ALMACENAR INFORMACIÓN DE COLOR PARA RENDERIZADO
                colorInfo.push({r, g, b});
                brightness = (r + g + b) / 3;  // PROMEDIO SIMPLE
            } else {
                brightness = 0.299 * r + 0.587 * g + 0.114 * b;  // LUMINOCIDAD ESTANDAR
            }

            // INVERTIR COLRES SI SE SELECCIONA
            if (invertColors) {
                brightness = 255 - brightness;
            }

            // AJUSTAR BRILLO SEGÚN ALFA
            brightness = brightness * a;

            const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
            asciiArt += asciiChars[charIndex];
        }
        asciiArt += '\n';
    }

    // YA NO APLICAMOS EL ESCALADO DE COLOR A LA IMAGEN
    if (colorMode === 'color') {
        localStorage.setItem('colorInfo', JSON.stringify(colorInfo));
    }

    return asciiArt;
}

function downloadAsText() {
    const asciiArt = document.getElementById('asciiOutput').textContent;
    const blob = new Blob([asciiArt], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ascii-art.txt';
    link.click();
}

function downloadAsImage() {
    const asciiArt = document.getElementById('asciiOutput').textContent;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // CONFIGURAR EL CANVAS
    const fontSize = 10; // TAMAÑO DE FUENTE EN PIXELES
    const lineHeight = fontSize * 1.2; // ALTURA DE LÍNEA
    const lines = asciiArt.split('\n');
    const canvasWidth = Math.max(...lines.map(line => line.length)) * fontSize;
    const canvasHeight = lines.length * lineHeight + 30; // ESPACIO ADICIONAL PARA LA MARCA DE AGUA

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // ESTABLECER ESTILO DEL CANVAS
    ctx.fillStyle = 'black'; // FONDO NEGRO
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = 'white'; // TEXTO BLANCO

    // DIBUJAR EL TEXTO ASCII EN EL CANVAS
    lines.forEach((line, index) => {
        ctx.fillText(line, 0, (index + 1) * lineHeight);
    });

    // AGREGAR MARCA DE AGUA
    ctx.font = '12px Arial'; // FUENTE DE LA MARCA DE AGUA
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // COLOR BLANCO CON OPACIDAD
    ctx.textAlign = 'center';
    ctx.fillText('Art2Code', canvas.width / 2, canvas.height - 10); // POSICIÓN DE LA MARCA DE AGUA

    // DESCARGAR LA IMAGEN
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'ascii-art.png';
    link.click();
}