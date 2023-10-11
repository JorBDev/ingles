import { chromium } from 'playwright';
import fetch from 'node-fetch';
import fs from 'fs';
import ExcelJS from 'exceljs';

import { palabras } from './wordsData.js';
/**
 * Proxima mejora: en el traductor de google hay un div que contiene las clases (c11pPb wZM8jf). Las 2 clases permanecen hasta que no se encuentre ningun detalle del texto ingresado. Pero si se encuentra algo se elimina la clase (c11pPb wZM8jf) y se agrega la clase (c11pPb). Se puede usar esto para saber si se encontraron traducciones o no.
 *
 * para saber esto se puede usar el metodo page.waitForSelector('.c11pPb.wZM8jf', { state: 'detached' }) que espera a que el elemento no este en el DOM o page.waitForSelector('.c11pPb', { state: 'attached' }) que espera a que el elemento este en el DOM
 */


// Crea y retonar la pagina de playwright
async function createPage(launchOptions = {}, contextOptions = {}, pageOptions = {}) {
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage(pageOptions);

    return {
        browser,
        context,
        page,
    }
}

/**  Busca x palabras obtenidas del archivo json en las palabras pasadas y retorna las palabras que no coincidan. En caso de que no exista el archivo se retorna el mismo arreglo de palabras y si todas las palabras del archivo json coinciden con las palabras pasadas se retornara un arreglo vacio
*    Extructura del archivo JSON: [{word:'palabra'}, {word: 'palabra2'}] -> puede tener mas propiedades pero debe tener la propiedad word.
*    @param {Array} allPalabras - Arreglo de palabras donde se buscaran las palabras del archivo json
*    @param {String} archivo - Nombre del archivo json sin la extension
*/
function filtrarPalabrasFaltantes(allPalabras = [], archivo = '') {
    if (allPalabras.length === 0 || archivo === '') return [];

    const data = getArr_JSON(archivo);

    if (data.length === 0) return allPalabras;
    console.log('data', data.length)
    console.log('palabras', allPalabras.length)

    // buscar que no hayan palabras repetidas en el mismo arreglo de palabras
    const palabrasRepetidas = allPalabras.filter((palabra, index) => allPalabras.indexOf(palabra) !== index);
    if (palabrasRepetidas.length > 0) console.log('❌ Palabras repetidas en el mismo arreglo de palabras: ', palabrasRepetidas.length + ' -> ' + palabrasRepetidas.join(', '));

    // buscar que no hayan palabras repetidas en data
    const dataRepetidas = data.filter((d, index) => data.findIndex(d2 => d2.word.toLowerCase() === d.word.toLowerCase()) !== index);
    if (dataRepetidas.length > 0) console.log(`❌ Palabras repetidas en el archivo json ${archivo}: `, dataRepetidas.length + ' -> ' + dataRepetidas.map(d => d.word).join(', '));

    // filtrar las palabras que falten por buscar
    const resultado = allPalabras.filter(p => {
        const r = data.every(d => d.word.toLowerCase() !== p.toLowerCase())
        if (r) console.log(`✅ Palabra no encontrada en el archivo ${archivo}  :`, p);
        // else console.log('❌ Palabra repetida en el archivo json: ', p);
        return r;
    });

    // const resultado = palabras.filter(palabra => !data.some(d => d.word.toLowerCase() === palabra.toLowerCase()));// si el .some retorna true significa que la palabra ya se busco y no se debe volver a buscar, por eso se niega el resultado

    console.log('✅ Palabras filtradas!', resultado.length);
    return resultado;
}

// Lee un archivo json y retorna un array, no hace falta poner la extension del archivo
function getArr_JSON(archivo = '') {
    if (archivo === '') {
        console.log('❌ El nombre del archivo esta vacio: ' + archivo);
        return [];
    }
    archivo += '.json';

    if (!fs.existsSync(archivo)) {
        console.log('❌ No se encontro el archivo', archivo);
        return [];
    }

    // leer archivo
    const dataString = fs.readFileSync(archivo);
    // convertir json a objeto
    const resultados = JSON.parse(dataString.toString());

    if (resultados.length === 0) console.log('❌ El archivo esta vacio', archivo);
    else console.log('✅ Datos obtenidos del archivo', archivo)

    return resultados;
}

// Guarda un array en un archivo json. Si el archivo ya existe se unen los resultados anteriores con los nuevos resultados
function guardarResultados_JSON(resultados = [], archivo = '') {
    if (resultados.length === 0 || archivo === '') return;

    archivo += '.json';
    try {
        // verificar si existe el archivo
        if (fs.existsSync(archivo)) {
            // leer archivo
            const dataString = fs.readFileSync(archivo);
            // convertir
            const data = JSON.parse(dataString.toString());// co
            // unir los dos arrays
            resultados = [...data, ...resultados];
        }

        // guardar resultados
        fs.writeFile(archivo, JSON.stringify(resultados, null, 2), err => {
            // manejar error
            if (err) throw err;
        });

        console.log(`✅ Archivo ${archivo} guardado!`);

    } catch (error) {
        console.log('❌ Error guardando el archivo: ' + archivo, error);
    }
}

// Leer un archivo txt y retornar el indice
function getIndice_TXT(archivo = '') {
    if (archivo === '') return 0;
    archivo += '.txt';

    if (fs.existsSync(archivo)) {
        // leer archivo
        const dataString = fs.readFileSync(archivo, 'utf8');
        // convertir json a numero
        const i = parseInt(dataString.toString());

        console.log('✅ Indice obtenido del archivo', archivo)
        return i + 1;
    }
    console.log('❌ No se encontro el archivo', archivo)
    return 0;
}

// Guardar el indice en un archivo txt
function guardarIndice_TXT(archivo = '', index = 0) {
    if (archivo === '') return;
    archivo += '.txt';

    fs.writeFileSync(archivo, index.toString());
}

// Obtiene y crear un json con los datos (pronunciacion y url del audio de la pronunciacion) de las palabras. Los datos son obtenido de Dictionary Cambridge. Retorna true si se obtuvieron todos los datos de las palabras y false si no se obtuvieron. De igual forma si no se obtuvieron todos los datos se guardan los datos obtenidos en un archivo json
async function getDataJSON(palabras = [], nameJSON = 'resultados_getDataJSON') {
    if (palabras.length === 0) {
        console.log('❌ El array de palabras esta vacio');
        return false;
    }

    // verificar si el archivo resutaldos_getDataJSON.json existe y si existe significa que ya se obtuvieron todos los datos
    const dataJSON = getArr_JSON(nameJSON);
    if (dataJSON.length > 0) {
        console.log('✅ Ya existe el JSON con los resultados completos: ' + nameJSON + '.json');
        return true;
    }
    const nameJSONAux = nameJSON + '(parciales)';

    // verificar que la palabra no exista en el archivo de resultados parciales
    const palabrasFiltradas = await filtrarPalabrasFaltantes(palabras, nameJSONAux);
    if (palabrasFiltradas.length === 0) {
        console.log('❌ Todas las palabras ya se encontraron, pero no se encontro el JSON con los resultados completos, se creara nuevamente con el nombre: ' + nameJSON + '.json');
        // Guardar en un nuevo archivo json
        const data = getArr_JSON(nameJSON);
        guardarResultados_JSON(data, nameJSON);
        return false;
    }

    let results = [];

    const { page, browser } = await createPage({}, { javaScriptEnabled: false });
    await page.route('**/*.{css,png,jpg,jpeg}', (route) => route.abort()); // quitar CSS e imagenes

    const baseUrl = 'https://dictionary.cambridge.org';

    try {

        let i = getIndice_TXT('indice_getDataJSON') || 0;

        for (i; i < palabrasFiltradas.length; i++) {
            console.log(`✅ Buscando datos de la palabra ${palabrasFiltradas[i]}`)
            // converir palabra a minusculas
            const palabra = (palabrasFiltradas[i].toLowerCase());
            // convertir el signo ' en - para que la url sea correcta
            const palabraUrl = palabra.replace(/'/g, '-');

            await page.goto(`${baseUrl}/es/pronunciaci%C3%B3n/ingles/${palabraUrl}`);
            try {
                const error = await page.getByRole('heading', { name: '404. Página no encontrada.' }).isVisible();
                if (error) {
                    console.log('entro al error 404');
                    throw new Error('Error 404'); // lanzar error y el catch lo captura
                }

                const { audioUk, audioUs } = await getPronunciacionAudios(page, palabra);
                const { phoneticUk, phoneticUs } = await getPronunciacionTexto(page, palabra);

                results.push({
                    word: palabra,
                    audioUk: audioUk ? baseUrl + audioUk : null,
                    audioUs: audioUs ? baseUrl + audioUs : null,
                    phoneticUk,
                    phoneticUs,
                });

                console.log(`✅ Word: (${palabra}) done!`);
            } catch (error) {
                console.log(`❌ Error 404 whit the word ${palabra}: ${error}`);
            }

            // guardar periodicamente
            if (i % 10 === 0 && i !== 0) {
                // guardar resultados
                guardarResultados_JSON(results, nameJSONAux);
                // guardar indice
                guardarIndice_TXT('indice_getDataJSON', i);

                // reiniciar array
                results = [];
            }
        }
        // guardar últimas palabras en un archivo json
        if (results.length > 0) {
            guardarResultados_JSON(results, nameJSONAux);
        }
    } catch (error) {
        console.log('Error en script:', error);
    } finally {
        await page.close();
        await browser.close();
    }

    // verificar si se obtuvieron todos los datos
    const palabrasFiltradas2 = filtrarPalabrasFaltantes(palabras, nameJSONAux);
    if (palabrasFiltradas2.length === 0) {
        // Guardar en un nuevo archivo json
        const data = getArr_JSON(nameJSON);
        fs.writeFileSync(`${nameJSON}.json`, JSON.stringify(data, null, 2));
        console.log(`✅ Se obtuvieron todos los datos y se guardaron en el archivo ${nameJSON}.json`);
        return true;
    }

    console.log(`❌ No se obtuvieron todos los datos! Por favor vuelva a ejecutar el script para obtener los datos faltantes, en caso de que siga sin obtener todos los datos, verifique que las palabras esten escritas correctamente y que no tengan caracteres especiales, si no soluciona el problema, rellene manualmente los datos faltantes en el archivo ${nameJSON}(parciales).json y luego vuelva a ejecutar el script`);
    return false;
}

function getImagenFromJSON(path, word) {
    const arrJSON = getArr_JSON(path);
    if (arrJSON.length === 0) return false;

    console.log(`❗❗ Ya existe el JSON de imagenes de ${word}. Se retorna la primera imagen del JSON`);
    return arrJSON[0];
}

// Funcion para obtener la url de la primera imagen y guardar la lista de imagenes en un archivo json
const getDataImage = async (word, page) => {
    // const archivo = `./media/${word}/${word}`;
    const archivo = `./prueba/${word}/${word}`;

    // Detener script si ya existe archivo y retornar la primera imagen del json
    const imagen = await getImagenFromJSON(archivo, word);
    if (imagen) return imagen;

    // const { page, browser } = await createPage({}, { javaScriptEnabled: false });

    // Obtener imagenes
    const url = `https://quizlet.com/webapi/3.2/images/search?query=${word}&perPage=10&languages=%5B%22en%22%2C%22es%22%5D`;

    await page.goto(url);

    await page.waitForSelector('pre');
    const contenido = await page.innerText('pre');

    // await page.close();
    // await browser.close();

    const imagesData = JSON.parse(contenido)?.responses[0].models.image;
    if (imagesData.length === 0 || !imagesData) {
        console.log('❌ No se encontraron imagenes para la palabra: ', word);
        return false
    }

    // obtener todas las imagenes
    const images = imagesData.map((image) => {
        return {
            id: image.id,
            name: word,
            url: image._legacyUrl,
            urlThumb: image._legacyUrlSmall,
            urlSquare: image._legacyUrlSquare,
            width: image.width,
            height: image.height,
        };
    });

    crearCarpeta(word);

    // guardar imagenes
    guardarResultados_JSON(images, archivo);

    // retornar la primera imagen
    return images[0];
}

// Retorna la pronunciacion de la palabra
async function getPronunciacionTexto(page, palabra) {
    let phoneticUk = null,
        phoneticUs = null;

    try {
        phoneticUk = await page.innerText('.ipa');
    } catch (error) {
        console.log(`❌ Error phoneticUk of ${palabra}: `, error);
    }

    try {
        phoneticUs = await page.locator('.ipa').nth(1).innerText();
    } catch (error) {
        console.log(`❌ Error phoneticUs of ${palabra}: `, error);
    }

    return { phoneticUk, phoneticUs };
}

// Retorna la url de los audios de la pronunciacion de la palabra
async function getPronunciacionAudios(page, palabra) {
    let audios = { audioUk: null, audioUs: null };

    for (const [key, value] of Object.entries(audios)) {
        // obtener indice
        const i = key === 'audioUk' ? 1 : 2;

        try {
            audios[key] = await page.getAttribute(`#audio${i} [type="audio/ogg"]`, 'src');
        } catch (error) {
            console.log(`❌ Error in ${key} whit word ${palabra}: `, error);
        }
    }

    return { audioUk: audios.audioUk, audioUs: audios.audioUs }
};

// Funcion para descargar todo tipo de archivos
async function downloadFile(url, folder, name = folder) {
    const extension = url.split('.').pop();

    const path = `./media/${folder}/${name}.${extension}`;
    // Detener script si ya existe archivo
    if (fs.existsSync(path)) {
        console.log(`❗❗ Ya existe el archivo ${name}.${extension}`);
        return;
    }

    crearCarpeta(folder);

    try {
        const data = await fetch(url);
        if (data.ok) {
            const body = data.body?.pipe(fs.createWriteStream(path));
            if (body) {
                console.log(`✅ File ${name}.${extension} downloaded!`);
            }
            return true;
        }
    } catch (error) {
        console.log(`❌ Error downloading file ${name}: ${error}`);
        return false;
    }

}

// fs.stat() sirve para obtener información de un archivo o carpeta
// fs.access() sirve para comprobar si existe un archivo o carpeta

// crea una carpeta en media/ si no existe
const crearCarpeta = (carpeta) => {
    if (!fs.existsSync(`./media/${carpeta}`)) {
        fs.mkdirSync(`./media/${carpeta}`);
        return true;
    }
    return false;
}

// funcion que llama a la funcione downloadFile para descargar las imagenes y audios de una palabra
async function descargarMedia(objecto, archivo = '') {

    const obj = archivo === '' ? objecto : getArr_JSON(archivo)[0];

    const { word, audioUk, audioUs, image } = obj;
    // descargamos imagen y audios de la palabra
    if (image?.url) await downloadFile(image.url, word);
    if (audioUs) await downloadFile(audioUs, word, `${word}-us`);
    if (audioUk) await downloadFile(audioUk, word, `${word}-uk`);
}

// obtiene las palabras que no tienen enlace de imagen. Se le pasa un array de objetos con la propiedad image y retorna un array con las palabras que no tienen enlace de imagen
function palabrasFaltantesPorImagen(data = []) {
    if (data.length === 0) {
        console.log('❌ El array de palabras esta vacio');
        return [];
    }

    const palabrasFaltantes = data.filter(d => !d.hasOwnProperty('image') || d.image === false);

    if (palabrasFaltantes.length === 0)
        console.log('✅ Todas las palabras ya tienen enlace de imagen');
    else
        console.log('✅ Palabras faltantes por imagen: ', palabrasFaltantes.length, +'->' + palabrasFaltantes.map(p => p.word).join(', '));

    return palabrasFaltantes;
}

// Funcion para agregar el enlace de la imagen a cada palabra y guardar en un archivo json. llama a la funcion getDataImage en caso de que no se haya encontrado la imagen de la palabra en el json
async function agregarEnlaceImagen(archivo = 'resultados_getDataJSON') {
    if (archivo === '') {
        console.log('❌ El nombre del archivo esta vacio');
        return;
    }

    archivo += '_conImagenes';

    // verificar si el archivo JSON existe y si existe significa que ya se obtuvieron todos los datos
    if (getArr_JSON(archivo).length > 0) {
        console.log('✅ Ya existe el JSON con los resultados completos: ' + archivo + '.json');
        return true;
    }
    archivo += '(parciales)';

    // verificar si existe el archivo y leerlo y buscar palabras faltantes por agregarle el enlace de la imagen
    const data = getArr_JSON(archivo);
    const dataFaltante = palabrasFaltantesPorImagen(data);
    if (dataFaltante.length === 0) {
        console.log('✅ Todas las palabras ya tienen enlace de imagen, se creara nuevamente el archivo con el nombre: ' + archivo + '.json');

        return true;
    }

    let i = getIndice_TXT('indice_agregarEnlaceImagen');

    const { page, browser } = await createPage({}, { javaScriptEnabled: false });

    for (i; i < dataFaltante.length; i++) {
        console.log(`✅ Buscando imagen de la palabra ${obj.word}`);
        const image = await getDataImage(obj.word, page);
        if (!image) continue;
        obj.image = image;

        // guardar periodicamente
        if (i % 10 === 0 && i !== 0) {
            // guardar resultados
            guardarResultados_JSON(data, archivo + '_conImagenes(parciales).json');
            // guardar indice
            guardarIndice_TXT('indice_agregarEnlaceImagen', i);
        }
    }

    page.close();
    browser.close();

    // guardar últimas palabras en un archivo json
    if (results.length > 0) {
        guardarResultados_JSON(results, archivo + 'resultados_conImagenes(parciales).json');
    }

    // verificar si se obtuvieron todos los datos
    const palabrasFaltantes = palabrasFaltantesPorImagen(dataFaltante);
    if (palabrasFaltantes.length === 0) {
        // Guardar en un nuevo archivo json
        fs.writeFileSync(`${archivo}_conImagenes.json`, JSON.stringify(data, null, 2));
        console.log(`✅ Se agregaron los enlaces de las imagenes a todas las palabras y se guardaron en el archivo ${archivo}_conImagenes.json`);
        return true;
    }

    console.log('❌ No se agregaron los enlaces de las imagenes a todas las palabras! Por favor vuelva a ejecutar el script para obtener los enlaces faltantes, en caso de que siga sin obtener todos los enlaces, verifique que las palabras esten escritas correctamente y que no tengan caracteres especiales, si no soluciona el problema, rellene manualmente los enlaces faltantes en el archivo resultadosparciales_agregarEnlaceImagen.json y luego vuelva a ejecutar el script');

}

function getAllCategoriasGramaticales(data = []) {
    if (data.length === 0) return [];

    const categoriasGramaticales = []
    data.forEach(d => {
        for (let key in d.categoriasGramaticales) {
            if (!categoriasGramaticales.includes(key)) {
                categoriasGramaticales.push(key);
            }
        }
    });

    return categoriasGramaticales;
}

// como parametro se le pasa el nombre del JSON que contiene los datos completos de las palabras
function crearExcelforAnki(archivo = '') {
    if (archivo === '') {
        console.log('❌ El nombre del archivo esta vacio');
        return;
    }

    const data = getArr_JSON(archivo);
    const categoriasGramaticalesAux = getAllCategoriasGramaticales(data);
    const formatearCategoriasGramaticalesExcel = categoriasGramaticalesAux.map(c => {
        return {
            header: c,
            key: c,
        }
    });

    // Nuevo libro
    let workbook = new ExcelJS.Workbook();

    // Hoja de trabajo
    let worksheet = workbook.addWorksheet('Resultados');

    // Agregar encabezados
    worksheet.columns = [
        { header: 'Palabra', key: 'word' },
        { header: 'Fonetica UK', key: 'phoneticUk' },
        { header: 'Fonetica US', key: 'phoneticUs' },
        { header: 'Traduccion', key: 'traduccion' },
        { header: 'Ejemplos', key: 'ejemplos' },
        { header: 'Traducciones Ejemplos', key: 'traduccionesEjemplos' },
        { header: 'Audio UK', key: 'audioUk' },
        { header: 'Audio US', key: 'audioUs' },
        { header: 'Imagen', key: 'imagen' },
        ...formatearCategoriasGramaticalesExcel,
    ];

    const xlsxContent = data.map((item) => {
        // añadir / al inicio y al final de la pronunciacion si no lo tiene
        if (item.phoneticUk && !item.phoneticUk.startsWith('/')) item.phoneticUk = '/' + item.phoneticUk;
        if (item.phoneticUk && !item.phoneticUk.endsWith('/')) item.phoneticUk = item.phoneticUk + '/';
        if (item.phoneticUs && !item.phoneticUs.startsWith('/')) item.phoneticUs = '/' + item.phoneticUs;
        if (item.phoneticUs && !item.phoneticUs.endsWith('/')) item.phoneticUs = item.phoneticUs + '/';

        // obtener ejemplos y traducciones
        let { ejemplos, traduccionesEjemplos } = getEjemplosTraduccionesExcel(item);

        // obtener caperta audio e imagen
        const audioUk = item.audioUk ? `[sound:ingles/${item.word}/${item.word}-uk.ogg]` : '';
        const audioUs = item.audioUs ? `[sound:ingles/${item.word}/${item.word}-us.ogg]` : '';
        const extension = item.image?.url ? item.image.url.split('.').pop() : '';
        const imagen = item.image ? `<img src="ingles/${item.word}/${item.word}.${extension}">` : '';

        const categoriasGramaticales = getCategoriasGramaticas(item);

        return {
            word: item.word,
            phoneticUk: item.phoneticUk,
            phoneticUs: item.phoneticUs,
            traduccion: item.traduccion,
            ...categoriasGramaticales,
            ejemplos,
            traduccionesEjemplos,
            audioUk,
            audioUs,
            imagen,
        }
    });

    // Agregar filas
    worksheet.addRows(xlsxContent);

    // Guardar archivo
    workbook.xlsx.writeFile('resultados.xlsx')
        .then(function () {
            console.log('¡Excel creado!');
        });
}

function getCategoriasGramaticas(item) {
    if (!item.categoriasGramaticales) {
        console.log('❌ El valor de categoriasGramaticales es null');
        return;
    }
    const categoriasGramaticales = {};
    for (const [key, value] of Object.entries(item.categoriasGramaticales)) {

        let valueString = '';
        for (const [key2, value2] of Object.entries(value)) {

            // Verificar si es la ultima llave de cada iteracion
            if (Object.keys(value).indexOf(key2) === Object.keys(value).length - 1) { // primero se obtiene el indice de la llave actual y se compara con el indice de la ultima llave
                valueString += `${key2}: ${value2.join(', ')}`;
                continue;
            }
            valueString += `${key2}: ${value2.join(', ')}\n`;
        }

        categoriasGramaticales[key] = valueString;
    }
    return categoriasGramaticales;
}

// funcion para obtener los ejemplos y traducciones de los ejemplos de una palabra
function getEjemplosTraduccionesExcel(item = {}) {
    if (!item.ejemplos) {
        console.log('❌ El valor de ejemplos es null');
        return;
    }

    let ejemplos = '';
    let traduccionesEjemplos = '';
    if (item.ejemplos && item.ejemplos.length > 0) {

        for (let index = 0; index < item.ejemplos.length; index++) {

            if (index === item.ejemplos.length - 1) {
                if (item.ejemplos[index].ejemplo) ejemplos += item.ejemplos[index].ejemplo;
                if (item.ejemplos[index].traduccion) traduccionesEjemplos += item.ejemplos[index].traduccion;
                break;
            }

            if (item.ejemplos[index].ejemplo) ejemplos += item.ejemplos[index].ejemplo + '\n';
            if (item.ejemplos[index].traduccion) traduccionesEjemplos += item.ejemplos[index].traduccion + '\n';

        }

        item.ejemplos.forEach((ejemplo, i) => {
            if (i === item.ejemplos.length - 1) {
                ejemplos += ejemplo?.ejemplo;
                ejemplo.
                    return;
            }
            ejemplos += ejemplo?.ejemplo + '\n';
            traduccionesEjemplos += ejemplo?.traduccion + '\n';
        });
    }
    return { ejemplos, traduccionesEjemplos };
}

// funcion para obtener la traduccion de una texto
async function getTraduccion(texto = '', page) {
    if (!texto) {
        console.log('❌ El texto esta vacio');
        return '';
    }

    try {
        await page.waitForLoadState('networkidle');
        console.log('✅ Se ha cargado la pagina de Deepl');
    } catch (error) {
        // error en waitForSelector, se recarga la pagina
        await page.reload();
        await page.waitForLoadState('networkidle');
    }

    const element = await page.$('#translation-source-heading');
    const textArea = await element.innerText();

    await page.getByTestId('translator-source-input').getByLabel(textArea).fill(texto);

    // try {
    //     // await page.waitForSelector('[data-testid="translator-target-input"] div[aria-disabled="false"]')[0];

    // } catch (error) {
    //     console.log('❌ No se encontro el componente de traduccion');
    //     return '';
    // }

    // Obtener traduccion
    let traduccion = '';

    try {
        await page.waitForTimeout(1000);
        traduccion = await page.getByTestId('translator-target-input').innerText();
        // validar que la traduccion no este vacia o tenga unicamente saltos de linea

        if (traduccion === '' || traduccion === '\n') {
            console.log('❗Esperando 1 segundos más para obtener la traduccion')
            await page.waitForTimeout(1000);
            traduccion = await page.getByTestId('translator-target-input').innerText();
        }

        if (traduccion === '' || traduccion === '\n') {
            console.log('❗Esperando 1 segundos más para obtener la traduccion')
            await page.waitForTimeout(1000);
            traduccion = await page.getByTestId('translator-target-input').innerText();
        }

        if (traduccion === '' || traduccion === '\n') {
            await page.waitForTimeout(2000);
            console.log('❗Esperando 2 segundos más para obtener la traduccion')
            traduccion = await page.getByTestId('translator-target-input').innerText();
        }

        if (traduccion === '' || traduccion === '\n') {
            await page.waitForTimeout(3000);
            console.log('❗Esperando 3 segundos más para obtener la traduccion')
            traduccion = await page.getByTestId('translator-target-input').innerText();
        }
        if (traduccion === '' || traduccion === '\n') {
            await page.waitForTimeout(7000);
            console.log('❗Esperando 7 ulimos segundos más para obtener la traduccion')
            traduccion = await page.getByTestId('translator-target-input').innerText();
        }

        if (traduccion === '' || traduccion === '\n') throw new Error('Traduccion vacia');

        await page.getByTestId('translator-source-clear-button').click();
    } catch (error) {
        console.log('❌ No se encontraron traducciones de los ejemplos');
        return '';
    }

    // await browser.close();
    // await page.close();

    return traduccion;
}

/**
 * cambiar espacios por %20 y saltos de linea por %0A
 * @param {String} texto
 * @returns {String} texto formateado
 */
function formatearTextoToURL(texto) {
    texto = texto.replace(/ /g, '%20');
    texto = texto.replace(/\n/g, '%0A');
    return texto;
}

/**
 * Formatea los ejemplos que estan en un array de objetos a un string. El objeto debe tener la propiedad ejemplo: Ejemplos: [{ejemplo: 'ejemplo1'}, {ejemplo: 'ejemplo2'}]
 * @param  {Array} arr - Array de objetos con la propiedad ejemplo
 * @returns {String} - String con los ejemplos separados por \n
 */
function formatearArrEjemplos_String(arr) {
    let stringExamples = '';
    arr.forEach((ejemplo, i) => {
        if (i === arr.length - 1) {
            stringExamples += ejemplo.ejemplo;
            return;
        }
        stringExamples += ejemplo.ejemplo + '\n'; // agregar salto de linea
    });

    return stringExamples;
}


/**
 * funcion para obtener la traduccion de una palabra, las traducciones mas comunes y algunos ejemplos en ingles
 * @param {String} palabra
 * @param {*} page
 * @returns
 */
async function getDefinicionComunesAndEjemplos(palabra = '', page) {
    if (palabra === '') return {};

    await page.goto(`https://translate.google.com/details?sl=en&tl=es&text=${palabra}&op=translate`);

    // try {
    //    //ingresa la palabra en el input de Source text
    // await page.getByLabel('Source text', { exact: true }).fill(palabra);
    //     console.log('✔ Se ha encontrado el input de Source text');
    // } catch (error) {
    //     console.log('❌ No se encontro el input de Source text');
    //     return {};
    // }

    try {
        await page.waitForLoadState('networkidle');
        const hayDetalles = await page.$('.c11pPb:not([class*=" "])');
        if (!hayDetalles) throw new Error('No hay detalles');
    } catch (e) {
        console.log(`❌ No se encuentran detalles de la palabra ${palabra} o no se ha cargado la pagina correctamente: ${e}`);
        return {};
    }

    const mostrarMas = await page.$$('.VfPpkd-LgbsSe.VfPpkd-LgbsSe-OWXEXe-INsAgc.VfPpkd-LgbsSe-OWXEXe-dgl2Hf.Rj2Mlf.OLiIxf.PDpWxe.P62QJc.LQeN7.xxrV1d');
    for (const item of mostrarMas) {
        try {
            // Intentar dispatchEvent
            await item.dispatchEvent('click');
        } catch (error) {
            // Si falla, volver a obtener el handle y reintentar
            const handle = await page.$('.VfPpkd-LgbsSe.VfPpkd-LgbsSe-OWXEXe-INsAgc.VfPpkd-LgbsSe-OWXEXe-dgl2Hf.Rj2Mlf.OLiIxf.PDpWxe.P62QJc.LQeN7.xxrV1d');
            await handle?.dispatchEvent('click');

            console.log('error en dispatchEvent ', error);
        }
    }


    const resultado = await page.evaluate(() => {
        const t = document.querySelectorAll('.U87jab');

        const traducciones = {
            traduccion: '',
            categoriasGramaticales: {},
            ejemplos: [],
        };

        document.querySelectorAll('.AZPoqf.OvhKBb').forEach((item) => {
            const ejemplo = item?.innerText;
            console.log('ejemplo', ejemplo);
            if (!ejemplo) return;
            traducciones.ejemplos.push({ ejemplo: ejemplo, traduccion: [] });
        });

        const traduccionLiteral = document.querySelector('.usGWQd');

        if (traduccionLiteral?.childElementCount == 1) {
            traducciones.traduccion = traduccionLiteral.querySelector('.ryNqvb').innerText
        } else if (traduccionLiteral?.childElementCount == 2) {
            let aux = '';
            traduccionLiteral.querySelectorAll('.HwtZe').forEach((item, i) => {

                if (i === traduccionLiteral.childElementCount - 1) {
                    aux += item.innerText;
                    return;
                }
                aux += item.innerText + '/';
            });
            traducciones.traduccion = aux;
        }

        t.forEach((item) => {
            const titulo = item.querySelector('.eIKIse.Nv4rrc')?.innerText;
            console.log('titulo', titulo);
            if (!titulo) return;

            traducciones.categoriasGramaticales[titulo] = {};

            const traduccionesT = item.querySelectorAll('.kgnlhe');

            for (let i = 0; i < traduccionesT.length; i++) {
                const traduccion = traduccionesT[i]?.innerText;
                console.log('traduccion', traduccion);

                const frecuecia = item.querySelectorAll('.YF3enc')[i].ariaLabel ?? '';
                console.log('frecuecia', frecuecia);
                if (traducciones.categoriasGramaticales[titulo][frecuecia] === undefined)
                    traducciones.categoriasGramaticales[titulo][frecuecia] = [];

                if (traduccion == '') break; // si no es una traduccion comun o poco comun y ya se guardo una traduccion se detiene el bucle

                traducciones.categoriasGramaticales[titulo][frecuecia] = [...traducciones.categoriasGramaticales[titulo][frecuecia], traduccion];
                // traducciones[titulo] = [...traducciones[titulo], traduccion];
            }

        });

        return traducciones;
    });

    // try {
    //     // borrar el texto del input
    //     await page.getByLabel('Source text', { exact: true }).click({ clickCount: 3 })
    //     await page.keyboard.press('Backspace');

    //     await page.waitForTimeout(2000);

    // } catch (error) {
    //     console.log('❌ No se encontro el input de Source text');
    //     return {};
    // }

    return { word: palabra, ...resultado }
}

/**
 * Funcion para obtener la traduccion de los ejemplos y añadirlos al array de ejemplos pasados por parametro
 */
async function añadirTraduccionA_Ejemplos(obj = [], page) {
    if (obj?.ejemplos.length === 0) {
        console.log('❌ El array de ejemplos esta vacio' + JSON.stringify(obj, null, 2));
        return [];
    }
    const { ejemplos } = obj;
    const stringExamples = formatearArrEjemplos_String(ejemplos);

    // Obtener traducciones de los ejemplos
    const traduccion = await getTraduccion(stringExamples, page);
    // Separar la traduccion por \n\n para obtener las traducciones de cada texto
    const traduccionesEjemplos = traduccion.split('\n\n');

    const ejemplosConTraduccion = obj.ejemplos.map((ejemplo, i) => {
        ejemplo.traduccion = traduccionesEjemplos[i];
        return ejemplo;
    });

    return {
        ...obj,
        ejemplos: ejemplosConTraduccion,
    };
}



// traduccion: '',
//     categoriasGramaticales: { },
// ejemplos: [],

/**
 * Funcion que llama a la funcion getDefinicionComunesAndEjemplos() para obtener la definicion de la palabra y tambien otras definiciones comunes, no tan comunes y raras, y tambien algunos ejemplos en ingles usando la palabra. Luego llama a la funcion añadirTraduccionA_Ejemplos para obtener la traduccion de los ejemplos y añadirla al array de ejemplos y por ultimo guarda los resultados en un archivo json
 */
async function getDefinicionComunesAndEjemplos_Traduccion(palabras) {

    const launchOptions = {
        // headless: false,
        // slowMo: 5000,
    }
    const contextOptions = {
        locale: 'en-US',
        timezoneId: 'America/New_York',
    }
    const { page: pageGoogle, context, browser } = await createPage(launchOptions, contextOptions);
    // await pageGoogle.goto(`https://translate.google.com/details?sl=en&tl=es&text=${palabra}%0A&op=translate`);

    // await pageGoogle.goto('https://translate.google.com/details?sl=en&tl=es');
    const pageDeepl = await context.newPage();
    await pageDeepl.goto('https://www.deepl.com/translator#en/es/');


    let resultados = [];
    let errores = [];
    for await (let p of palabras) {
        console.log('✅ Buscando definicion de la palabra', p)

        // El traductor de google es mejor recargando la pagina cada vez que se busca una palabra
        const resultadoGoogle = await getDefinicionComunesAndEjemplos(p, pageGoogle);

        if (Object.keys(resultadoGoogle).length === 0 || !resultadoGoogle) {
            errores.push(p);
            console.log('-----------------------------------entra en el if')
            continue;
        }

        const resultado = await añadirTraduccionA_Ejemplos(resultadoGoogle, pageDeepl);
        resultados.push(resultado);
    }

    pageGoogle.close();
    pageDeepl.close();
    browser.close();

    // guardar resultados
    if (resultados.length == palabras.length) {
        guardarResultados_JSON(resultados, 'resultados_getDataJSON_Ejem_Traduccion.json');
    } else {
        guardarResultados_JSON(resultados, 'resultados_getDataJSON_Ejem_Traduccion(parciales).json');

        // guardar errores
        guardarResultados_JSON(errores, 'errores_getDataJSON_Ejem_Traduccion.json');
    }


    return resultados;
}
// Iniciar script
(async () => {
    crearExcelforAnki()
    return;
    const palabras = ['up', 'hello', 'sfasf', 'happy'];
    await getDataJSON(palabras);
    const resultado = await getDefinicionComunesAndEjemplos_Traduccion(palabras);
    console.log('resultado', JSON.stringify(resultado, null, 2));
    guardarResultados_JSON(resultado, 'resultadosPruebaMejorada.json');

    // try {
    //     await page.waitForSelector('.c11pPb.wZM8jf', { state: 'detached' }).then(() => console.log('✅ Se ha cargado la pagina'));// el estado detached es cuando el elemento no esta en el DOM, es decir cuando no se ha cargado la pagina, entonces cuando se cargue el elemento se ejecuta el then

    // } catch (error) {
    //     console.log(`❌ No se encuentran detalles de la palabra ${palabra}`);
    // }
    // console.log('fin')
    // page.close();
    // browser.close();

    // Obtener datos de las palabras
    // let resultado = await getDataJSON(palabras); // esta linea se comenta para no volver a obtener los datos, ya que se guardaron en el archivo resultados.json y no es necesario volver a obtenerlos
    // console.log('resultado', resultado.length);
    return;
    // let resultado = [];

    if (!resultado || resultado.length === 0) {
        // leer archivo
        const dataString = fs.readFileSync('resultados.json', 'utf8');
        // convertir json a objeto
        const data = JSON.parse(dataString.toString());
        console.log('✅ Datos obtenidos del archivo resultados.json');
        resultado = data;
    }

    // Obtener ejemplos y sus traducciones y categorias gramaticales
    let palabrasError = [];
    let index = 0;
    if (fs.existsSync('indice.txt')) {
        // leer archivo
        const dataString = fs.readFileSync('indice.txt', 'utf8');
        // convertir json a numero
        index = parseInt(dataString.toString());
        index += 1;
    }
    let resultadosConEjemplos = [];

    for (index; index < resultado.length; index++) {

        const palabra = resultado[index];
        if (palabra.hasOwnProperty('ejemplos')) {
            console.log(`❗❗ Ya se encontraron los ejemplos de la palabra ${palabra.word}`);
            continue;
        }
        console.log(`(${index}): ✅ Buscando ejemplos de la palabra ${palabra.word}`);

        try {
            const ejemplos = await getDefinicionComunesAndEjemplos(palabra.word);
            resultadosConEjemplos.push({ ...palabra, ...ejemplos })
            // console.log(JSON.stringify(resultadosConEjemplos, null, 2));
        } catch (error) {
            console.log(`❌ Error buscando ejemplos de la palabra ${palabra.word}: ${error}`);
            palabrasError.push(palabra.word);

            // guardar errores en archivos json y si ya existen se unen los datos nuevos con los anteriores
            try {
                // verificar si existe el archivo
                if (fs.existsSync('palabrasConEjemplosErrores.json')) {
                    // leer archivo
                    const dataString = fs.readFileSync('palabrasConEjemplosErrores.json');
                    // convertir a json
                    const data = JSON.parse(dataString.toString());
                    // unir los dos arrays
                    palabrasError = [...data, ...palabrasError];
                }

                // guardar resultados
                fs.writeFile(`palabrasConEjemplosErrores.json`, JSON.stringify(palabrasError, null, 2), err => {
                    // manejar error
                    if (err) throw err;
                });

                console.log('✅ Archivo de errores con ejemplos guardado! Errores:', palabrasError.length, 'de', resultado.length, 'palabras');
                palabrasError = [];

            } catch (error) {
                console.log('❌ Error guardando archivo con ejemplo de errores', error);
            }

            if (palabrasError.length > 10) {
                console.log('⚠⚠ Se han producido demasiados errores seguidos, se detiene el script');
                // guardar indice del for en un .txt para continuar despues en el mismo punto
                fs.writeFileSync(`indice.txt`, index.toString());
                break;
            }
            continue;
        }

        // guardar periodicamente
        if (index % 10 === 0 && index !== 0) {
            // guardar resultados
            try {
                // verificar si existe el archivo
                if (fs.existsSync('resultadosConEjemplos.json')) {
                    // leer archivo
                    const dataString = fs.readFileSync('resultadosConEjemplos.json');
                    // convertir a json
                    const data = JSON.parse(dataString.toString());
                    // unir los dos arrays
                    resultadosConEjemplos = [...data, ...resultadosConEjemplos];
                }

                // guardar resultados
                fs.writeFile(`resultadosConEjemplos.json`, JSON.stringify(resultadosConEjemplos, null, 2), err => {
                    // manejar error
                    if (err) throw err;
                });

                console.log('✅ Archivo de resultados con ejemplos guardado! (periodicamente)');
                resultadosConEjemplos = [];

            } catch (error) {
                console.log('❌ Error guardando archivo (periodicamente) de resultados con ejemplos', error);
            }


            // guardar indice del for en un .txt para continuar despues en el mismo punto
            fs.writeFileSync(`indice.txt`, index.toString());
            console.log('✅ Indice guardado! (periodicamente):' + index + ' de ' + resultado.length + ' palabras');
        }
    }

    // Guardar resultados
    try {
        // verificar si existe el archivo
        if (fs.existsSync('resultadosConEjemplos.json')) {
            // leer archivo
            const dataString = fs.readFileSync('resultadosConEjemplos.json');
            // convertir a json
            const data = JSON.parse(dataString.toString());
            // unir los dos arrays
            resultadosConEjemplos = [...data, ...resultadosConEjemplos];
        }

        // guardar resultados
        fs.writeFile(`resultadosConEjemplos.json`, JSON.stringify(resultadosConEjemplos, null, 2), err => {
            // manejar error
            if (err) throw err;
        });

        console.log('✅ Archivo de resultados con ejemplos guardado!');

    } catch (error) {
        console.log('❌ Error guardando archivo de resultados con ejemplos', error);
    }

    return;
    crearExcelforAnki(resultado);

    // Añadir enlace de la imagen a cada palabra y guardar en un archivo json
    agregarEnlaceImagen(resultado);

    // Descargar imagenes y audios
    for (let r of resultado) {
        await descargarMedia(r);// await para no saturar el servidor
        // // detener un tiempo para que no se sature el servidor
        // await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('✅ Descarga de imagenes y audios finalizada!');
})();
