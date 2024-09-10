const path = require('path')
const { spawn } = require('child_process')

module.exports = function () {
    let gymPython = spawn('python', [
        path.join(__dirname, 'venv.py'),
    ], {
        stdio: "inherit"
    });

    /*gymPython.stdout.on('data', (data) => {
        console.log(data);
    });
    gymPython.stderr.on('data', (data) => {
        console.log(data);
    });
    gymPython.stderr.on('close', () => {
        console.log("Python closed");
    });*/

    return gymPython;
}