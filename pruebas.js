import axios from "axios";
import fs from "fs";
import path from "path";

// Obtener la extensión de un archivo
// const urlgif = "https://o.quizlet.com/cZDE.6rHW7IrGptXSGm8FA.gif";
// const urljpg = "https://o.quizlet.com/ptqCa7LsKjiVSBVPI3OfTA.jpg";

// const extensionOne = urlgif.split('.').pop();
const extensionTwo = urljpg.split('.').pop();


// descargar imagen de url con axios y guardarla en una carpeta con fs
async function downloadImage(url, name = 'image') {

    axios.get(url, {
        responseType: 'arraybuffer'
    })
        .then(({ data }) => {
            fs.writeFile(name + '.jpg', data, (error) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Imagen guardada exitosamente en la raíz del proyecto.');
                }
            });
        })
        .catch((error) => {
            console.log(error);
        });
}
// downloadImage('https://o.quizlet.com/ptqCa7LsKjiVSBVPI3OfTA.jpg', 'hello');
// let results = [
//     {
//         "word": "jorge",
//         "audioUk": "https://dictionary.cambridge.org/es/media/ingles/uk_pron_ogg/u/ukf/ukfet/ukfette011.ogg",
//         "audioUs": "https://dictionary.cambridge.org/es/media/ingles/us_pron_ogg/f/few/few__/few.ogg",
//         "phoneticUk": "fjuː",
//         "phoneticUs": "fjuː"
//     },
//     {
//         "word": "botero",
//         "audioUk": "https://dictionary.cambridge.org/es/media/ingles/uk_pron_ogg/u/ukg/ukgru/ukgrumb019.ogg",
//         "audioUs": "https://dictionary.cambridge.org/es/media/ingles/us_pron_ogg/g/gua/guara/guarantee.ogg",
//         "phoneticUk": "ˌgær.ənˈtiː",
//         "phoneticUs": "ˌger.ənˈtiː"
//     },
// ];
// if (fs.existsSync('resultados.json')) {
//     // leer archivo
//     const data = fs.readFileSync('resultados.json');
//     // convertir json a objeto
//     const dataJson = JSON.parse(data.toString());
//     // unir los dos arrays
//     results = [...dataJson, ...results];

//     // guardar resultados
//     fs.writeFile(`resultados.json`, JSON.stringify(results, null, 2), err => {
//         // manejar error
//         if (err) throw err;
//     });
// }

// ver palabras repetidas del resultado.json
// if (fs.existsSync('resultados.json')) {
//     // leer archivo
//     const data = fs.readFileSync('resultados.json');
//     // convertir json a objeto
//     const dataJson = JSON.parse(data.toString());

//     // obtener palabras repetidas
//     const words = dataJson.map(item => item.word);
//     const repeatedWords = words.filter((item, index) => words.indexOf(item) !== index);
//     console.log(repeatedWords);
//     console.log(repeatedWords.length);
// }

// const obj = {
//     nombre: 'jorge',
//     apellido: 'botero',
//     cash: false
// }

// const obj2 = {
//     nombre: 'jhon',
//     apellido: 'botero',
// }

// console.log(obj.cash ? obj.nombre + ' tiene cash' : obj.nombre + ' no tiene cash')

// console.log(obj2.hasOwnProperty('cash') ? obj2.nombre + ' tiene cash' : obj2.nombre + ' no tiene cash')

// const frecueciaTraduccion = ['Común', 'Poco común']

// if (!frecueciaTraduccion.includes('comunn')) {
//     console.log('no esta')
// } else {
//     console.log('esta')
// }

// const obj = {
//     hola: []
// };

// obj.hola.push({ 'h': [] });

// console.log(obj.hola[0]['h'].length);

// if (obj.hola[0]['h']['noexiste'] === undefined) {
//     console.log('no existe')
// }
// console.log(obj.hola[0]['h']['noexiste'])

// verificamos que la propiedad del objeto no tenga un objeto vacio
// if (Object.keys(obj.hola['h']).length !== 0) {
//     // El objeto no está vacío
//     console.log('no esta vacio')
//     console.log(Object.keys(obj.hola['h']).length);
// } else {
//     // El objeto está vacío
//     console.log('esta vacio');
// }

// const arr = ['hola', 'como', 'estas'];

// arr.forEach((item, index) => {
//     if (index === 1) return;
//     console.log(item);
// });

function getObjeto() {

    return { prueba: 'prueba', prueba2: 'prueba2' };
}

console.log('Holaaaaa');


(async () => {
    // let palabrasError = ['prueba', 'prueba2'];
    // try {

    //     // verificar si existe el archivo
    //     if (fs.existsSync('palabrasConEjemplosErrores.json')) {
    //         // leer archivo
    //         const dataString = fs.readFileSync('palabrasConEjemplosErrores.json');
    //         // convertir a json
    //         const data = JSON.parse(dataString.toString());
    //         // unir los dos arrays
    //         palabrasError = [...data, ...palabrasError];
    //     }

    //     // guardar resultados
    //     fs.writeFile(`palabrasConEjemplosErrores.json`, JSON.stringify(palabrasError, null, 2), err => {
    //         // manejar error
    //         if (err) throw err;
    //     });

    //     console.log('✅ Archivo de errores guardado!');

    // } catch (error) {
    //     console.log('❌ Error guardando archivo de errores', error);
    // }

    let resultado = [];
    if (fs.existsSync('resultadosConEjemplos.json')) {
        // leer archivo
        const dataString = fs.readFileSync('resultadosConEjemplos.json');
        // convertir a json
        const data = JSON.parse(dataString.toString());
        // unir los dos arrays
        resultado = data;
    }

    // const sinEjemplosResultado = resultado.flatMap(r => {
    //     return r.ejemplos.length === 0 ? r.word : [];
    // });

    // const sinTraduccionResultado = resultado.flatMap(r => {

    //     if (r.ejemplos.length !== 0) {
    //         if (!r.ejemplos[0].hasOwnProperty('traduccion')) {
    //             return r.word;
    //         }
    //     }
    //     return [];
    // });

    // const categoriasGramaticalesExistentes = [];
    // const categoriasGramaticales = resultado.flatMap(r => {
    //     if (!categoriasGramaticalesExistentes.includes(r.categoriasGramaticales)) {
    //         categoriasGramaticalesExistentes.push(r.categoriaGramatical);
    //         return r.categoriaGramatical;
    //     }
    //     return [];
    // });

    // console.log('❗❗sinEjemplosResultado (', sinEjemplosResultado.length, ')', JSON.stringify(sinEjemplosResultado, null, 2));
    // console.log('❗❗sinTraduccionResultado (', sinTraduccionResultado.length, ')', JSON.stringify(sinTraduccionResultado, null, 2));

    //-------------------------------------------
    // const categoriasGramaticales = [];
    // resultado.forEach(r => {
    //     // for con key y value
    //     // for (const [key, value] of Object.entries(r.categoriasGramaticales)) { // con of key y value o solo value
    //     //     console.log(`${key}: ${JSON.stringify(value)}`);
    //     //     console.log(key);
    //     // }
    //     // for con solo key
    //     for (let key in r.categoriasGramaticales) {
    //         console.log(r.categoriasGramaticales[key]);
    //         if (!r.categoriasGramaticales.includes(key)) {
    //             r.categoriasGramaticales.push(key);
    //         }
    //     }
    // });

    // categoriasGramaticales.forEach(c => console.log(c));
    //-----------------------------------------------

    // const { prueba, prueba2 } = getObjeto();
    // console.log(prueba, prueba2);

    const item = {
        "categoriasGramaticales": {
            "Noun": {
                "Common": [
                    "cuero",
                    "piel"
                ],
                "Rare": [
                    "gamuza"
                ],
                "a": [
                    "cuero",
                    "piel"
                ],
                "b": [
                    "gamuza"
                ]
            },
            "Verb": {
                "Rare": [
                    "hacer de cuero",
                    "hacer de piel",
                    "zurrar"
                ]
            },
            "prueba": {
                "Rare": [
                    "hacer de cuero",
                    "hacer de piel",
                    "zurrar"
                ]
            }
        }
    }

    // const categoriasGramaticales = {};
    // for (const [key, value] of Object.entries(item.categoriasGramaticales)) {

    //     let valueString = '';
    //     for (const [key2, value2] of Object.entries(value)) {

    //         // Verificar si es la ultima llave de cada iteracion
    //         if (Object.keys(value).indexOf(key2) === Object.keys(value).length - 1) {// primero se obtiene el indice de la llave actual y se compara con el indice de la ultima llave
    //             valueString += `${key2}: ${value2.join(', ')}`;
    //             continue;
    //         }
    //         valueString += `${key2}: ${value2.join(', ')}\n`;
    //     }

    //     categoriasGramaticales[key] = valueString;
    // }
    // console.log(JSON.stringify(categoriasGramaticales, null, 2));

    // const a = undefined, b = null, c = '', d = 0, e = false, f = NaN, g = [], h = { "hola": "hola" };
    // let i;

    // if (!a && !b && !c && !d && !e && !f) {
    //     console.log('todos son falsos');
    // }

    // if (!g || !h) {
    //     console.log('alguno es verdadero');
    // }

    // // validar objeto vacio
    // if (Object.keys(h).length === 0 || !i) {
    //     console.log('objeto vacio');
    // }

    let audios = { audioUk: null, audioUs: null };

    // for (const [key, value] of Object.entries(audios)) {
    //     console.log(key, value);
    // }

    // for (key in audios) {
    //     console.log(key, audios[key]);
    // }
})();
