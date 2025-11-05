<?php
header('Content-Type: application/json; charset=utf-8');
$q = isset($_GET['q']) ? $_GET['q'] : false;

$url = "http://sparql.archives-ouvertes.fr/sparql?default-graph-uri=&query=".urlencode($q)."&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on&run=+Run+Query+";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

// Vérifier les erreurs
if ($response === false) {
    echo '{error: ' . curl_error($ch).'}';
} else {
    // Afficher la réponse
    echo $response;
}
// Fermer la session cURL
curl_close($ch);
?>
