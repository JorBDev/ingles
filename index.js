import { chromium } from 'playwright';
import fetch from 'node-fetch';
import fs from 'fs';
import ExcelJS from 'exceljs';

import { palabras } from './wordsData.js';

// Funcion para obtener y crear un json con los datos (pronunciacion y url de audio de la pronunciacion) de las palabras
async function getDataJSON(palabras = []) {
    // verificar que la palabra no exista en el archivo de resultados
    if (fs.existsSync('resultadosPrueba.json')) {
        // leer archivo
        const dataString = fs.readFileSync('resultadosPrueba.json');
        // convertir json a objeto
        const data = JSON.parse(dataString.toString());
        // filtrar las palabras que no existan en el archivo de resultados
        palabras = palabras.filter(palabra => !data.some(p => p.word === palabra.toLowerCase()));
        console.log('✅ Palabras filtradas!', palabras.length);
        if (palabras.length === 0) return [];
    }

    let results = [];
    let palabrasError = [];
    let contadorErroresSeguidos = 1;
    let contadorErroesInicio = 0;

    const browser = await chromium.launch({
        // headless: false,
        // slowMo: 5000,
    });
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    // quitar CSS y imagenes
    await page.route('**/*.{css,png,jpg,jpeg}', (route) => route.abort());

    try {

        const baseUrl = 'https://dictionary.cambridge.org';
        for (let i = 0; i < palabras.length; i++) {
            // converir palabra a minusculas
            const palabra = (palabras[i].toLowerCase());
            // convertir el signo ' en - para que la url sea correcta
            const palabraUrl = palabra.replace(/'/g, '-');

            let phoneticUs = null,
                phoneticUk = null,
                audioUs = null,
                audioUk = null;

            try {

                await page.goto(`${baseUrl}/es/pronunciaci%C3%B3n/ingles/${palabraUrl}`);


                const error = await page.getByRole('heading', { name: '404. Página no encontrada.' }).isVisible();
                if (error) throw new Error('Error 404'); // lanzar error y el catch lo captura

                try {
                    audioUk = await page.getAttribute('#audio1 [type="audio/ogg"]', 'src');

                } catch (error) {
                    console.log(`❌ Error audioUk of ${palabra}: `, error);
                }

                try {
                    audioUs = await page.getAttribute('#audio2 [type="audio/ogg"]', 'src');
                } catch (error) {
                    console.log(`❌ Error audioUs of ${palabra}: `, error);
                }
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

                results.push({
                    word: palabra,
                    audioUk: audioUk ? baseUrl + audioUk : null,
                    audioUs: audioUs ? baseUrl + audioUs : null,
                    phoneticUk,
                    phoneticUs,
                });
                console.log(`✅ Word: (${palabra}) done!`);
            } catch (error) {
                console.log(`❌ Error whit the word ${palabra}: ${error}`);
                palabrasError.push(palabra);

                if (contadorErroesInicio === (i - 1)) {
                    contadorErroresSeguidos++;
                } else {
                    contadorErroresSeguidos = 1;
                }

                contadorErroesInicio = i;
            }

            // if (contadorErroresSeguidos >= 10) {
            //     console.log('⚠⚠ Se han producido demasiados errores seguidos, se detiene el script');
            //     break;
            // }
        }

        // guardar últimas palabras y errores
        if (palabrasError.length > 0) {
            try {
                // verificar si existe el archivo
                if (fs.existsSync('palabrasErroresPrueba.json')) {
                    // leer archivo
                    const dataString = fs.readFileSync('palabrasErroresPrueba.json');
                    // convertir a json
                    const data = JSON.parse(dataString.toString());
                    // unir los dos arrays
                    palabrasError = [...data, ...palabrasError];
                }

                // guardar resultados
                fs.writeFile(`palabrasErroresPrueba.json`, JSON.stringify(palabrasError, null, 2), err => {
                    // manejar error
                    if (err) throw err;
                });

                console.log('✅ Archivo de errores guardado!');

            } catch (error) {
                console.log('❌ Error guardando archivo de errores', error);
            }
        }

        if (results.length > 0) {
            try {
                // verificar si existe el archivo
                if (fs.existsSync('resultadosPrueba.json')) {
                    // leer archivo
                    const dataString = fs.readFileSync('resultadosPrueba.json');
                    // convertir
                    const data = JSON.parse(dataString.toString());// co
                    // unir los dos arrays
                    results = [...data, ...results];
                }

                // guardar resultados
                fs.writeFile(`resultadosPrueba.json`, JSON.stringify(results, null, 2), err => {
                    // manejar error
                    if (err) throw err;
                });

                console.log('✅ Datos de palabras guardado!');

            } catch (error) {
                console.log('❌ Error guardando los Datos de las palabras', error);
            }
        }
    } catch (error) {
        console.log('Error en script:', error);
    } finally {
        await browser.close();
    }

    return results;
}

// Funcion para obtener la url de la primera imagen y guardar la lista de imagenes en un archivo json
const getDataImage = async (word) => {
    const path = `./media/${word}/${word}.json`;

    // Detener script si ya existe archivo
    if (fs.existsSync(path)) {
        console.log(`❗❗ Ya existe el JSON de imagenes de ${word}. Se retorna la primera imagen del JSON`);
        // leer archivo
        const dataString = fs.readFileSync(path);
        // convertir json a objeto
        const data = JSON.parse(dataString.toString());
        // retornar la primera imagen
        return data[0];
    }

    const browser = await chromium.launch({
        // headless: false,
    });
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    // Obtener imagenes
    const url = `https://quizlet.com/webapi/3.2/images/search?query=${word}&perPage=10&languages=%5B%22en%22%2C%22es%22%5D`;

    await page.goto(url);
    await page.waitForSelector('pre');
    const contenido = await page.innerText('pre');

    await browser.close();
    await page.close();

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
    fs.writeFileSync(path, JSON.stringify(images, null, 2));

    console.log(`✅ Imagenes de ${word} guardadas!`)
    // retornar la primera imagen
    return {
        id: imagesData[0].id,
        name: word,
        url: imagesData[0]._legacyUrl,
        urlThumb: imagesData[0]._legacyUrlSmall,
        urlSquare: imagesData[0]._legacyUrlSquare,
        width: imagesData[0].width,
        height: imagesData[0].height,
    };
}

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
async function descargarMedia(obj) {
    const { word, audioUk, audioUs, image } = obj;
    // descargamos imagen y audios de la palabra
    if (image?.url) await downloadFile(image.url, word);
    if (audioUs) await downloadFile(audioUs, word, `${word}-us`);
    if (audioUk) await downloadFile(audioUk, word, `${word}-uk`);
}

// Funcion para agregar el enlace de la imagen a cada palabra y guardar en un archivo json. llama a la funcion getDataImage en caso de que no se haya encontrado la imagen de la palabra en el json
async function agregarEnlaceImagen(data) {
    console.log('data', data.length);
    if (!data || data.length === 0)
        return;

    let newData = [];
    try {
        // verificar si existe el archivo
        const datosParciales = fs.existsSync('resultados_parciales.json');

        if (datosParciales) {
            console.log('✅ Se encontraron datos parciales');
            // leer archivo
            const dataString = fs.readFileSync('resultados_parciales.json');
            // convertir json a objeto
            const dataParcial = JSON.parse(dataString.toString());
            newData = dataParcial;
        }

        for await (let obj of data) {
            const palabraBuscada = newData.length ? newData.some(newD => {
                return newD.word === obj.word && newD.hasOwnProperty('image');
            }) : false;// ya se procesó la palabra

            if (palabraBuscada) {
                console.log(`❗❗ Ya se encontró la imagen de la palabra ${obj.word}`);
                continue;
            }

            if (obj.hasOwnProperty('image') && obj.image != false) {
                newData.push(obj); // si ya se encontró la imagen se guarda el objeto
                continue;
            }
            if (obj.hasOwnProperty('image')) {
                newData.push(obj);
                continue;
            }// si no se encontraron imagenes para la palabra se guarda el objeto sin imagen

            console.log(`✅ Buscando imagen de la palabra ${obj.word}`);
            const image = await getDataImage(obj.word);
            newData.push({ ...obj, image });
        }
        console.log("newData", newData.length)
        // guardar resultados de forma sincrona para que no se sature el servidor
        fs.writeFileSync(`resultadosPrueba.json`, JSON.stringify(newData, null, 2));
        console.log('✅ Enlace de las imagenes guardado!');

    } catch (error) {

        // Manejar el error
        console.error('Ocurrió un error', error);

        // Guardar el progreso actual
        fs.writeFileSync('resultados_parciales.json', JSON.stringify(newData, null, 2))

        console.log('✅ Se guardaron resultados parciales');

    }
}

function crearExcel(data) {

    /**
     *"word": "occasionally",
        "audioUk": "https://dictionary.cambridge.org/es/media/ingles/uk_pron_ogg/u/uko/ukobs/ukobsti024.ogg",
        "audioUs": "https://dictionary.cambridge.org/es/media/ingles/us_pron_ogg/o/occ/occas/occasionally.ogg",
        "phoneticUk": "əˈkeɪ.ʒən.əl.i",
        "phoneticUs": "əˈkeɪʒ.nəl.i",
        "traduccion": "ocasionalmente",
        "categoriasGramaticales": {
          "Adverb": {
            "Common": [
              "de vez en cuando"
            ],
            "Uncommon": [
              "a veces"
            ],
            "Rare": [
              "cada cuando"
            ]
          }
        },
        "ejemplos": [
          {
            "ejemplo": "very occasionally the condition can result in death",
            "traduccion": ""
          },
          "image": {
      "id": 14811660,
      "name": "occasionally",
      "url": "http://o.quizlet.com/GTfYhjnzG115oQLsHYJ35g.jpg",
     *
     *
     *
     */

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
        { header: 'Comun', key: 'comun' },
        { header: 'Poco comun', key: 'pocoComun' },
        { header: 'Raro', key: 'raro' },
        { header: 'Ejemplos', key: 'ejemplos' },
        { header: 'Traducciones Ejemplos', key: 'traduccionesEjemplos' },
        { header: 'Audio UK', key: 'audioUk' },
        { header: 'Audio US', key: 'audioUs' },
        { header: 'Imagen', key: 'imagen' },
    ];

    const xlsxContent = data.map((item, i) => {
        // añadir / al inicio y al final de la pronunciacion si no lo tiene
        if (item.phoneticUk && !item.phoneticUk.startsWith('/')) item.phoneticUk = '/' + item.phoneticUk;
        if (item.phoneticUk && !item.phoneticUk.endsWith('/')) item.phoneticUk = item.phoneticUk + '/';
        if (item.phoneticUs && !item.phoneticUs.startsWith('/')) item.phoneticUs = '/' + item.phoneticUs;
        if (item.phoneticUs && !item.phoneticUs.endsWith('/')) item.phoneticUs = item.phoneticUs + '/';

        // obtener ejemplos y traducciones
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

        // obtener caperta audio e imagen
        const audioUk = item.audioUk ? `ingles/${item.word}/${item.word}-uk.ogg` : '';
        const audioUs = item.audioUs ? `ingles/${item.word}/${item.word}-us.ogg` : '';
        const extension = item.image?.url ? item.image.url.split('.').pop() : '';
        const imagen = item.image ? `ingles/${item.word}/${item.word}.${extension}` : '';


        // obtener comun, pocoComun y raro de la categoria gramatical Noun (sustantivo)
        const comun = item.categoriasGramaticales?.Noun?.Common?.join('\n');
        const pocoComun = item.categoriasGramaticales?.Noun?.Uncommon?.join('\n');
        const raro = item.categoriasGramaticales?.Noun?.Rare?.join('\n');
        const noun = 'Sustantivo' + '\n' + comun + '\n' + pocoComun + '\n' + raro;


        // resultado
        if (i == 0) {
            console.log('word', item.word)
            console.log('phoneticUk', item.phoneticUk)
            console.log('phoneticUs', item.phoneticUs)
            console.log('imagen', imagen)
            console.log('audioUk', audioUk)
            console.log('audioUs', audioUs)
            console.log('ejemplos', ejemplos)
            console.log('traduccionesEjemplos', traduccionesEjemplos)
            console.log('comun', comun)
            console.log('pocoComun', pocoComun)
            console.log('raro', raro)
        }

        return {
            word: item.word,
            phoneticUk: item.phoneticUk,
            phoneticUs: item.phoneticUs,
            traduccion: item.traduccion,
            comun,
            pocoComun,
            raro,
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
    workbook.xlsx.writeFile('resultadosCasiCompleto.xlsx')
        .then(function () {
            console.log('¡Excel creado!');
        });
}

// funcion para obtener las traducciones de los ejemplos
async function getTraduccionesDeEjemplos(arrEjemplos = {}) {
    if (!arrEjemplos) return;

    let stringExamples = '';

    arrEjemplos.forEach((ejemplo, i) => {
        if (i === arrEjemplos.length - 1) {
            stringExamples += ejemplo.ejemplo;
            return;
        }
        stringExamples += ejemplo.ejemplo + '%0A';// %0A es un salto de linea en la url
    });
    // cambiar espacios por %20
    stringExamples = stringExamples.replace(/ /g, '%20');

    const browser = await chromium.launch({
        // headless: false,
        // slowMo: 5000,
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    const url = "https://www.deepl.com/translator#en/es/" + stringExamples;
    await page.goto(url);
    try {
        await page.waitForLoadState('networkidle');
    } catch (error) {
        // error en waitForSelector, se recarga la pagina
        await page.reload();
        await page.waitForLoadState('networkidle');
    }

    // Obtener traduccion
    let traduccion = '';
    try {
        traduccion = await page.getByTestId('translator-target-input').innerText();
        // validar que la traduccion no este vacia o tenga unicamente saltos de linea
        if (traduccion === '' || traduccion === '\n' || traduccion === '\n\n' || traduccion === '\n\n\n') throw new Error('Traduccion vacia');

    } catch (error) {
        console.log('❌ No se encontraron traducciones de los ejemplos');
        try {
            // error en waitForSelector, se recarga la pagina y se vuelve a intentar, si falla se retorna null
            await page.reload();
            await page.waitForLoadState('networkidle');
            traduccion = await page.getByTestId('translator-target-input').innerText();
        } catch (error) {
            await browser.close();
            await page.close();
            return null;
        }
    }

    await browser.close();
    await page.close();

    // Separar la traduccion por \n\n para obtener las traducciones de cada palabra
    const traducciones = traduccion.split('\n\n');

    return traducciones;
}

// funcion para obtener las traducciones mas comunes y los ejemplos de una palabra
async function getTraduccionesComunesAndEjemplos(palabra = 'they') {
    const browser = await chromium.launch({
        // headless: false,
        // slowMo: 5000,
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Obtener traducciones
    const url = `https://translate.google.com/details?sl=en&tl=es&text=${palabra}%0A&op=translate`;
    await page.goto(url);
    try {
        //esperar a que la pagina carue completamente
        await page.waitForLoadState('networkidle');
    } catch (error) {
        await page.reload();
        await page.waitForLoadState('networkidle');
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

    const traducciones = await page.evaluate(() => {
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
                // const frecueciaTraduccion = ['Común', 'Poco común', 'Common', 'Uncommon']

                if (traduccion == '') break; // si no es una traduccion comun o poco comun y ya se guardo una traduccion se detiene el bucle

                traducciones.categoriasGramaticales[titulo][frecuecia] = [...traducciones.categoriasGramaticales[titulo][frecuecia], traduccion];
                // traducciones[titulo] = [...traducciones[titulo], traduccion];
            }

        });

        return traducciones;
    });

    await browser.close();
    await page.close();

    // Obtener traducciones de los ejemplos
    const traduccionesEjemplos = await getTraduccionesDeEjemplos(traducciones.ejemplos);


    // Añadir traducciones de los ejemplos
    if (!traduccionesEjemplos) {
        console.log('❌ No se encontraron traducciones de los ejemplos');
        return traducciones;
    }
    traducciones.ejemplos.forEach((ejemplo, i) => {
        ejemplo.traduccion = traduccionesEjemplos[i];
    });
    return traducciones;

}

(async () => {
    // Make sure to run headed.
    // const browser = await chromium.launch({ headless: false });

    // // Setup context however you like.
    // const context = await browser.newContext({
    //     locale: 'en-US',
    //     timezoneId: 'America/New_York',
    // });
    // // const context = await browser.newContext({
    // //     locale: 'es-CO',
    // //     timezoneId: 'America/Bogota',
    // // });
    // await context.route('**/*', route => route.continue());

    // // await page.getByTestId('translator-source-input').getByRole('paragraph').click();
    // // await page.getByTestId('translator-source-clear-button').click();
    // // Pause the page, and start recording manually.
    // const page = await context.newPage();

    // await page.goto('https://www.deepl.com/translator#en/es/');
    // await page.goto('https://translate.google.com/details?sl=en&tl=es');



    //obtener elemento por el id "translation-source-heading"
    // const element = await page.$('#translation-source-heading');
    // const texto = await element.innerText();

    // await page.getByTestId('translator-source-input').getByLabel(texto).fill('safsas');
    // await page.getByTestId('translator-source-input').getByLabel('Texto de partida').fill('aja');


    // await page.pause();
    // await page.getByTestId('translator-source-input').getByLabel(texto).fill('hello');
    // await page.getByTestId('translator-source-input').getByLabel('Source text').fill('hello');

    // await page.pause();
    // await page.getByTestId('translator-source-input').getByLabel(texto).fill('siuuuu');


    // await page.pause();
})();

// Iniciar script
(async () => {
    // Obtener datos de las palabras
    // let resultado = await getDataJSON(palabras); // esta linea se comenta para no volver a obtener los datos, ya que se guardaron en el archivo resultados.json y no es necesario volver a obtenerlos
    // console.log('resultado', resultado.length);
    const prueba = ['up', 'hello', 'sfasf', 'happy'];
    let resultado = await getDataJSON(prueba);
    console.log('resultado', resultado.length, resultado);

    // let resultadosConEjemplos = [];
    // if (fs.existsSync('resultadosConEjemplos.json')) {
    //     // leer archivo
    //     const dataString = fs.readFileSync('resultadosConEjemplos.json');
    //     // convertir a json
    //     const data = JSON.parse(dataString.toString());
    //     // unir los dos arrays
    //     resultadosConEjemplos = [...data, ...resultadosConEjemplos];
    // }
    // crearExcel(resultadosConEjemplos);


    // return;


    // let resultado = [];

    // if (!resultado || resultado.length === 0) {
    //     // leer archivo
    //     const dataString = fs.readFileSync('resultados.json', 'utf8');
    //     // convertir json a objeto
    //     const data = JSON.parse(dataString.toString());
    //     console.log('✅ Datos obtenidos del archivo resultados.json');
    //     resultado = data;
    // }

    // Obtener ejemplos y sus traducciones y categorias gramaticales
    let palabrasError = [];
    let index = 0;
    // if (fs.existsSync('indice.txt')) {
    //     // leer archivo
    //     const dataString = fs.readFileSync('indice.txt', 'utf8');
    //     // convertir json a numero
    //     index = parseInt(dataString.toString());
    //     index += 1;
    // }
    let resultadosConEjemplos = [];

    for (index; index < resultado.length; index++) {

        const palabra = resultado[index];
        if (palabra.hasOwnProperty('ejemplos')) {
            console.log(`❗❗ Ya se encontraron los ejemplos de la palabra ${palabra.word}`);
            continue;
        }
        console.log(`(${index}): ✅ Buscando ejemplos de la palabra ${palabra.word}`);

        try {
            const ejemplos = await getTraduccionesComunesAndEjemplos(palabra.word);
            resultadosConEjemplos.push({ ...palabra, ...ejemplos })
            // console.log(JSON.stringify(resultadosConEjemplos, null, 2));
        } catch (error) {
            console.log(`❌ Error buscando ejemplos de la palabra ${palabra.word}: ${error}`);
            palabrasError.push(palabra.word);

            // guardar errores en archivos json y si ya existen se unen los datos nuevos con los anteriores
            try {
                // verificar si existe el archivo
                if (fs.existsSync('palabrasConEjemplosErroresPrueba.json')) {
                    // leer archivo
                    const dataString = fs.readFileSync('palabrasConEjemplosErroresPrueba.json');
                    // convertir a json
                    const data = JSON.parse(dataString.toString());
                    // unir los dos arrays
                    palabrasError = [...data, ...palabrasError];
                }

                // guardar resultados
                fs.writeFile(`palabrasConEjemplosErroresPrueba.json`, JSON.stringify(palabrasError, null, 2), err => {
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
                if (fs.existsSync('resultadosConEjemplosPrueba.json')) {
                    // leer archivo
                    const dataString = fs.readFileSync('resultadosConEjemplosPrueba.json');
                    // convertir a json
                    const data = JSON.parse(dataString.toString());
                    // unir los dos arrays
                    resultadosConEjemplos = [...data, ...resultadosConEjemplos];
                }

                // guardar resultados
                fs.writeFile(`resultadosConEjemplosPrueba.json`, JSON.stringify(resultadosConEjemplos, null, 2), err => {
                    // manejar error
                    if (err) throw err;
                });

                console.log('✅ Archivo de resultados con ejemplos guardado! (periodicamente)');
                resultadosConEjemplos = [];

            } catch (error) {
                console.log('❌ Error guardando archivo (periodicamente) de resultados con ejemplos', error);
            }


            // guardar indice del for en un .txt para continuar despues en el mismo punto
            fs.writeFileSync(`indicePrueba.txt`, index.toString());
            console.log('✅ Indice guardado! (periodicamente):' + index + ' de ' + resultado.length + ' palabras');
        }
    }

    // Guardar resultados
    try {
        // verificar si existe el archivo
        if (fs.existsSync('resultadosConEjemplosPrueba.json')) {
            // leer archivo
            const dataString = fs.readFileSync('resultadosConEjemplosPrueba.json');
            // convertir a json
            const data = JSON.parse(dataString.toString());
            // unir los dos arrays
            resultadosConEjemplos = [...data, ...resultadosConEjemplos];
        }

        // guardar resultados
        fs.writeFile(`resultadosConEjemplosPrueba.json`, JSON.stringify(resultadosConEjemplos, null, 2), err => {
            // manejar error
            if (err) throw err;
        });

        console.log('✅ Archivo de resultados con ejemplos guardado!');

    } catch (error) {
        console.log('❌ Error guardando archivo de resultados con ejemplos', error);
    }

    return;
    crearExcel(resultado);

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
