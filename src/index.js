// enumeration
const MSG_TYPE = {
    'INITIALIZE_WORKER': 'INITIALIZE_WORKER',
    'WORKER_INITIALIZED': 'WORKER_INITIALIZED',
    'RUN_WASM': 'RUN_WASM',
    'ASK_QUESTION': 'ASK_QUESTION',
    'PRINT': 'PRINT',
};

const BUFFER_INITIAL_SIZE = 1024; // 2**10

let WORKER = null;
let SHARED_ARR = null;
let SHARED_ARR_U8 = null;
let SHARED_ARR_I32 = null;

const processMessage = (e) => {
    // console.log('processMessage', e);
    const msg = e.data;
    const dec = new TextDecoder();
    console.log('processMessage', msg);
    switch (msg.type) {
        case MSG_TYPE.WORKER_INITIALIZED: {
            console.log('main got MSG_TYPE.WORKER_INITIALIZED');
            WORKER.postMessage({
                'type': MSG_TYPE.RUN_WASM,
            });
            break;
        }
        case MSG_TYPE.ASK_QUESTION: {
            console.log('main got MSG_TYPE.ASK_QUESTION');
            const quesObj = msg.payload;
            console.log('quesObj', quesObj);
            // Atomics.store(int32, 0, 42);
            // const result = Atomics.load(int32, 0);
            // console.log('main 2s later after atomics, result:', result);
            // const obj = newProblem(
            //     'move2kube.service.bar.port',
            //     'input',
            //     'enter a port to use for the service "bar"',
            //     [],
            //     [],
            //     '8080',
            //     [],
            // );
            // console.log('obj', obj);
            const x = prompt(quesObj.description, quesObj.default ?? 'my_default_value');
            quesObj.answer = x; // new port number
            // quesObj.answer = '10042'; // new port number
            toMsg(SHARED_ARR_U8, SHARED_ARR_I32, quesObj);
            console.log('encoded the object in the shared buffer');
            const awoke = Atomics.notify(SHARED_ARR_I32, 0);
            console.log('notify awoke:', awoke);
            // worker.postMessage({
            //     'type': 'WATCH',
            // });
            break;
        }
        case MSG_TYPE.PRINT: {
            console.log('main got MSG_TYPE.PRINT');
            const s = dec.decode(msg.payload);
            console.log('[WASM PRINT]', s);
            break;
        }
        default: {
            throw new Error(`unknown msg type ${msg.type}`);
        }
    }
};

const toMsg = (uint8, int32, obj) => {
    const s = JSON.stringify(obj);
    const enc = new TextEncoder();
    const x = enc.encode(s);
    if (x.byteLength + 8 > uint8.byteLength) {
        throw new Error('object length is larger than buffer length');
    }
    int32[1] = x.byteLength;
    uint8.set(x, 8);
};

const fromMsg = (uint8, int32) => {
    const len = int32[1];
    if (len <= 0) throw new Error('object length is zero or negative');
    const x = uint8.slice(8, 8 + len);
    const dec = new TextDecoder();
    const s = dec.decode(x);
    return JSON.parse(s);
};

const newProblem = (
    id = '', type = '', description = '',
    hints = [], options = [], _default = undefined,
    categories = [], answer = undefined,
) => ({
    id, type, description, hints,
    options, categories, answer,
    'default': _default,
});

const main = () => {
    console.log('main start');
    console.log('crossOriginIsolated', window.crossOriginIsolated);
    // const wasmMem = new WebAssembly.Memory({ initial: 1, maximum: 4, shared: true });
    // console.log('wasmMem', wasmMem);
    // const sharedBuffer = wasmMem.buffer;
    const sharedBuffer = new SharedArrayBuffer(BUFFER_INITIAL_SIZE);
    SHARED_ARR = sharedBuffer;
    console.log('sharedBuffer', sharedBuffer);
    const uint8 = new Uint8Array(sharedBuffer);
    SHARED_ARR_U8 = uint8;
    console.log('uint8', uint8);
    const int32 = new Int32Array(sharedBuffer);
    SHARED_ARR_I32 = int32;
    console.log('int32', int32);
    const worker = new Worker(new URL('./worker.js', import.meta.url));
    WORKER = worker;
    console.log('worker', worker);
    worker.addEventListener('message', processMessage);
    // Atomics.store(int32, 0, 42);
    worker.postMessage({
        'type': MSG_TYPE.INITIALIZE_WORKER,
        'payload': { sharedBuffer },
    });
    console.log('worker', worker);
    console.log('main end');
};

main();

