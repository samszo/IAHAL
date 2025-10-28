flowchart TD
    JSON_to_OMK[JSON to OMK] -->loadJSON[["`Load JSON`"]]
    loadJSON-..->dbStructures[("`Structures`")] 
    loadJSON-..->dbAuteurs[("`Auteurs`")] 
    loadJSON-..->dbTags[("`Tags`")] 
    loadJSON-..->dbDepots[("`Dépôts`")] 
    dbStructures-..->importRefOmk[["`Import refs dans OMK`"]]
    dbAuteurs-..->importRefOmk
    dbTags-..->importRefOmk
    importRefOmk-..->dbOmk[("`OMK`")]
    importRefOmk-..->replaceId[["`Remplace les ids`"]]
    dbDepots-..->replaceId
    replaceId-..->importDepotOmk[["`Import dépôts dans OMK`"]]
    importDepotOmk-..->dbOmk