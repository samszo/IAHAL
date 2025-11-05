flowchart TD
    JSON_to_OMK[JSON to OMK] -->loadJSON[["`Load JSON`"]]
    loadJSON-..->dbStructures[("`Structures`")] 
    loadJSON-..->dbTags[("`Tags`")] 
    loadJSON-..->dbAuteurs[("`Auteurs`")] 
    loadJSON-..->dbDepots[("`Dépôts`")] 
    dbStructures-..->importRefOmk[["`Import refs dans OMK`"]]
    dbTags-..->importRefOmk
    importRefOmk-..->dbOmk[("`OMK`")]
    dbOmk-..->showItems[["`Affiche les items`"]]
    dbOmk-..->replaceId[["`Remplace les ids`"]]
    replaceId-..->importAuteur[["`Import auteurs`"]]
    replaceId-..->importDepots[["`Import dépôts`"]]
    dbAuteurs-..->replaceId
    dbDepots-..->replaceId
    importAuteur-..->dbOmk
    importDepots-..->dbOmk
    showItems -->FIN