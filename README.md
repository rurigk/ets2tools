# Ets2Tools

With this tool you can edit the game saves of Euro truck simulator 2

### Features
- Change the assigned trailer after attach the trailer
- Generate cargo (From all cities to all cities but only the base game cargos for now)
- Import cargo from file
- Export GPS route
- Import GPS route

### Runing and building

##### Prerequisites
node.js v10.15.3 or newer
npm
python 2
msbuild 140

##### Running
Install the npm dependencies
```bash
npm i
```
Then run ets2tools.js with node
```bash
node ets2tools.js
```
##### Building to bin
Install the dev dependencies
```bash
pkg ets2tools.js
```

### Third party bin

##### Sii_Decrypt.exe
This software originally written by ncs-sniper help with the decryption of the game.sii file
You can find a fork of a fork of the original code in https://github.com/rurigk/SII_Decrypt

I cannot guarantee that the SII_Decrypt.exe binary included in this repository is a direct compilation of the code provided by this fork so proceed with caution in its use

### Credits
##### Some people helped me a lot with information about SII files and testing the program

JCGamer
Ecchi :)
MariaPaz
Donato
Mystere
Gustav0
ElOrco44