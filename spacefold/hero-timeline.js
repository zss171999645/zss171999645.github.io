window.SpaceFoldOpeningTiming = {
  "fps": 24,
  "frames": 528,
  "orbit": 420,
  "operationHolds": {"encode":147,"decode":309},
  "phases": [
    {"id":"input","frame":0,"inspect":0},
    {"id":"encode","frame":34,"inspect":99},
    {"id":"flow","frame":169,"inspect":188},
    {"id":"decode","frame":202,"inspect":256},
    {"id":"room","frame":412,"inspect":528}
  ],
  "actions": [
    {"id":"locate","phase":"encode","frame":34,"inspect":44},
    {"id":"children","phase":"encode","frame":50,"inspect":69},
    {"id":"merge","phase":"encode","frame":76,"inspect":100},
    {"id":"add","phase":"encode","frame":112,"inspect":137},
    {"id":"latent","phase":"encode","frame":148,"inspect":160},
    {"id":"predict","phase":"decode","frame":202,"inspect":223},
    {"id":"split","phase":"decode","frame":234,"inspect":257},
    {"id":"branch","phase":"decode","frame":271,"inspect":294},
    {"id":"bed","phase":"decode","frame":310,"inspect":322},
    {"id":"refine","phase":"decode","frame":330,"inspect":342}
  ],
  "levels": [[64,330],[128,347],[256,364],[512,381],[1024,398]],
  "sourceFrames": [[0,0],[28,27],[34,29],[50,39],[112,51],[148,60],[169,68],[201,91],[202,92],[234,95],[271,97],[310,99],[330,100],[346,109],[347,110],[364,126],[381,142],[398,157],[412,170],[420,180],[527,287]]
};
