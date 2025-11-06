import {loader} from './loader.js';   
import {appUrl} from './appUrl.js';

export class dataHAL {
    constructor(params) {
        var me = this;
        this.data = params.data ? params.data : [];
        this.dataAct = [];
        this.dataDoc = [];
        this.dataTag = [];
        this.dataOrg = [];
        this.dataActDocTag = [];
        this.urlData = params.urlData;
        this.urlAct = params.urlAct;
        this.urlDoc = params.urlDoc;
        this.urlTag = params.urlTag;
        this.urlOrg = params.urlTag;
        this.urlActDocTag = params.urlActDocTag;
        this.fields = params.fields ? params.fields : "&fl=authIdHal_s,authIdForm_i,halId_s,keyword_s,title_s,submitType_s,subTitle_s,language_s,abstract_s,domainAllCode_s,docid,uri_s,producedDate_s,publicationDate_s,authFirstName_s,authLastName_s,authStructId_i,docType_s";
        this.csv = params.csv;
        this.wait = new loader();
        this.endLoadData = params.endLoadData ? params.endLoadData : false;
        let apiHAL = "https://api.archives-ouvertes.fr/search",
            apiHALrefAut = "https://api.archives-ouvertes.fr/ref/author",
            apiHALrefAutStr = "https://api.archives-ouvertes.fr/search/authorstructure",
            apiHALrefStr = "https://api.archives-ouvertes.fr/ref/structure",
            apiHALrefDom = "https://api.archives-ouvertes.fr/ref/domain",
            //problème de CORS policy sparqlHAL = "http://sparql.archives-ouvertes.fr/sparql?format=application/sparql-results+json&timeout=0&debug=on&run=+Run+Query+&query=",
            sparqlHAL = "sparqlHAL.php?q=",
            keys = [], dataCsv=[], reprise;

        this.init = function () {
            if(me.urlData){
                let dateField= 'publicationDate_s',
                pUrl = new appUrl({'url':new URL(me.urlData)}),
                q = pUrl.params && pUrl.params.has('q') ? pUrl.params.get('q') : 'authIdHal_s:samuel-szoniecky',
                fq = pUrl.params && pUrl.params.has('fq') ? "&fq="+pUrl.params.get('fq') : '',//'publicationDate_s:[2000 TO 2023]',
                uri = "https://api.archives-ouvertes.fr/search/?q="+q+fq
                    + "&rows=" + (pUrl.params.has('rows') ? +pUrl.params.get('rows') : "10000")
                    +"&fl=authIdHal_s,keyword_s,title_s,docid,uri_s,producedDate_s,publicationDate_s"
                    +"&sort="+dateField+" asc";
                d3.json(uri).then(data=>{
                    me.data = data.response.docs;
                });                
            }

            if(me.csv)getDataByRef();
            let pJson= [];
            if(me.urlAct)pJson.push({'o':'dataAct','u':d3.json(me.urlAct)});
            if(me.urlDoc)pJson.push({'o':'dataDoc','u':d3.json(me.urlDoc)});
            if(me.urlTag)pJson.push({'o':'dataTag','u':d3.json(me.urlTag)});
            if(me.urlOrg)pJson.push({'o':'dataOrg','u':d3.json(me.urlOrg)});
            if(me.urlActDocTag)pJson.push({'o':'dataActDocTag','u':d3.json(me.urlActDocTag)});
            if(pJson.length){
                Promise.all(pJson.map(p=>p.u)).then((values) => {
                    values.forEach((v,i)=>{
                        me[pJson[i].o]=v;
                    })
                    if(params.endLoadData)params.endLoadData(me);
                });                
            }
    
        }
        this.getActTagcloud = function () {
            let dataTagcloud = []; 
            me.dataAct.forEach(a=>{
                let adt = me.dataActDocTag.filter(d=>d.act==a.id);
                a.nb = adt.length;
                for (let i = 0; i < a.nb; i++) {
                    dataTagcloud.push({'nom':a.prenom+' '+a.nom});                    
                }
            })
            return dataTagcloud;
        }

        this.getKeywordTagcloud = function () {
            let dataTagcloud = [], dataSource = me.dataDoc ? me.dataDoc : me.data; 
            dataSource.map(d=>d.keyword_s).forEach(kw=>{
                if(kw)kw.forEach(w=>dataTagcloud.push({'word':w}));                    
            })
            return dataTagcloud;
        }

        function getDataByRef(){
            me.wait.show();
            me.dataAct = [];
            me.dataOrg = [];
            me.dataDoc = [];
            me.dataTag = [];
            me.dataActDocTag = [];
            reprise = false;
            d3.csv(me.csv).then(data=>{
                dataCsv = data;
                getDataDoc(0);                
            })
        }

        async function getDataDoc(num){
            /*gestion des reprises
            plus compliqué car le json final est global
            il faudrait faire une importation doc par doc dans workflow.js
            if(!reprise && dataCsv[num].halId_s!='hal-05196107'){
                getDataDoc(num+1);
                return;
            }else{
                console.log("reprise à ",dataCsv[num].halId_s);
                reprise = true;
            }
            */
           
            let d = dataCsv[num],
            hal = await d3.json(apiHAL+"?q=halId_s:"+d.halId_s+me.fields),
            ref = hal.response.docs[0];
            //TODO ajouter les infos manquantes depuis le csv
            //https://api.archives-ouvertes.fr/search/?q=halId_s:hal-01151337&wt=json&fl=docid,domainAllCode_s,fr_title_s,en_title_s,en_keyword_s,fr_keyword_s,fr_abstract_s,en_abstract_s,authIdPerson_i,authFullName_s,structId_i,docType_s,city_s,isbn_s,producedDate_s,files_s,page_s,country_s,language_s,conferenceTitle_s,scientificEditor_s,publisher_s,producedDate_s
            await getDataAut(0,ref);
            await getKey(d.halId_s,me.dataDoc,ref
                //{'idHal':d.halId_s,'titre':ref.title_s,'uri_s':ref.uri_s,'publicationDate_s':ref.publicationDate_s,'authIdHal_s':ref.authIdHal_s,'authFullName_s':ref.authFullName_s,'keyword_s':ref.keyword_s,'title_s':ref.title_s,'docid':ref.docid,'producedDate_s':ref.producedDate_s,'publicationDate_s':ref.publicationDate_s}
            );
            await addDocActTag(ref,'fr_keyword_s');
            await addDocActTag(ref,'en_keyword_s');
            await addDocActTag(ref,'domainAllCode_s');
            await addDocActTag(ref,'language_s');
            await addDocActTag(ref,'submitType_s');
            await addDocActTag(ref,'docType_s');                            
            if(num<(dataCsv.length-1)){
                await getDataDoc(num+1);
            }else{
                me.wait.hide();
                saveFile(JSON.stringify(me.dataAct),'dataHalAut.json');
                saveFile(JSON.stringify(me.dataDoc),'dataHalDepot.json');
                saveFile(JSON.stringify(me.dataTag),'dataHalKeyword.json');
                saveFile(JSON.stringify(me.dataOrg),'dataHalOrg.json');
                saveFile(JSON.stringify(me.dataActDocTag),'dataHalAutDocKey.json');                
            }
        }
        async function getDataAut(i,ref){
            let idAut = await getKey(ref.authFirstName_s[i]+ref.authLastName_s[i],me.dataAct,
                {'prenom':ref.authFirstName_s[i],'nom':ref.authLastName_s[i],'idPerson':ref.authIdPerson_i[i]}
            );
            if(i<(ref.authLastName_s.length-1)){
                await getDataAut(i+1,ref);
            }   
        }

        async function addDocActTag(data, champ, iAut=0, iChamp=0, iTag=0){
            if(data[champ]){
                if(Array.isArray(data[champ])){
                    let c = data[champ][iChamp],
                        firstName = data.authFirstName_s[iAut],
                        lastName = data.authLastName_s[iAut],
                        t = Array.isArray(c) ? c[iTag]: c;
                        me.dataActDocTag.push({
                            'doc':await getKey(data.halId_s),
                            'act':await getKey(firstName+lastName),
                            'tag':await getKey(champ+t,me.dataTag,{'type':champ,'val':t})
                        });
                        if(Array.isArray(c) && iTag<(c.length-1)){
                            await addDocActTag(data, champ, iAut, iChamp, iTag+1);
                        }else{
                            if(iChamp<(data[champ].length-1)){
                                await addDocActTag(data, champ, iAut, iChamp+1, 0);
                            }else{
                                if(iAut<(data.authFirstName_s.length-1)){
                                    await addDocActTag(data, champ, iAut+1, 0, 0);
                                }
                            }
                        }
                }else{
                    let tag = data[champ];
                    let firstName = data.authFirstName_s[iAut],
                        lastName = data.authLastName_s[iAut];
                    me.dataActDocTag.push({
                        'doc':await getKey(data.halId_s),
                        'act':await getKey(data.authFirstName_s[iAut]+data.authLastName_s[iAut]),
                        'tag':await getKey(champ+tag,me.dataTag,{'type':champ,'val':tag})
                    });        
                    if(iAut<(data.authFirstName_s.length-1)){
                        await addDocActTag(data, champ, iAut+1, 0, 0);
                    }
                }
            }

        }

        
        async function getKey(k,rs=false,r=false){
            if(keys[k]==undefined){
                if(!r.id)r.id=rs.length;
                if(rs==me.dataOrg && k.indexOf('#')>-1){
                    await me.getOrgInfosByIdOrg(k.replace('#struct-',''));
                }else if(rs==me.dataTag && r.type=='domainAllCode_s'){
                    await me.getKeywordInfosById(r.val);
                }else{
                    rs.push(r);
                    if(rs==me.dataAct){
                        await addActInfos(r);
                    }
                }
                keys[k]=rs.length-1;
            }
            return keys[k];
        }

        async function addActInfos(rs){
            let q = rs.idPerson ? apiHALrefAut+"?q=person_i:"+rs.idPerson+"&fq=valid_s:PREFERRED&fl=*" :
                apiHALrefAut+"?q=fullName_t:"+rs.nom+"&fq=fullName_t:"+rs.nom+"&fq=firstName_t:"+rs.prenom+"&fq=valid_s:PREFERRED&fl=*",
                rsHal=await d3.json(q);
            if(!rsHal.error && rsHal.response.docs && rsHal.response.docs.length>0){
                rs.full = rsHal.response.docs[0];
            }
            //récupère les intérets de l'auteur via sparql
            if(rs.full && rs.full.person_i){
                rs.interests = await me.getSparqlAuteursInterest(rs.full.person_i);
            }

            //récupère les infos de la structure
            let str, idStr = '';
            rs.idsOrg=[];
            //ATTENTION on passe par l'xml car le json ne renvoie pas toutes les infos
            const request = new XMLHttpRequest();
            request.open("GET", apiHALrefAutStr+"?wt=xml&lastName_t="+rs.nom+"&firstName_t="+rs.prenom, false); // `false` makes the request synchronous
            request.send(null);            
            if (request.status === 200) {
                const result = parseXml(request.responseText).response.result;
                if(result.org){
                    if(Array.isArray(result.org)){
                        result.org.forEach(async o=>{
                            await me.getOrgInfosByIdOrg(o['xml:id'].replace('#','').replace('struct-',''));
                            //await setOrgInfos(o,rs);
                            rs.idsOrg.push(o['xml:id'].replace('#','').replace('struct-',''));
                        })
                    }else{
                        await me.getOrgInfosByIdOrg(result.org['xml:id'].replace('#','').replace('struct-',''));
                        //setOrgInfos(result.org,rs);
                        rs.idsOrg.push(result.org['xml:id'].replace('#','').replace('struct-',''));
                    }
                }
            } 

        }
        async function setOrgInfos(o,rs) {
            if(o['xml:id']){
                let dt =                     {
                        'nom':o.orgName[1] ? o.orgName[1]['#text'] : o.orgName['#text'],
                        'docid':o['xml:id'].replace('struct-',''),
                        'idOrg':o['xml:id'],
                        'desc':o.orgName[1] ? o.orgName[0]['#text'] : '',
                        'address':o.desc && o.desc.address && o.desc.address.addrLine && o.desc.address.addrLine['#text'] ? o.desc.address.addrLine['#text']:"",
                        'country':o.desc && o.desc.address && o.desc.address.country ? o.desc.address.country.key : "",
                        'relations':o.listRelation && o.listRelation.relation ? o.listRelation.relation : [],
                        'idnos':o.idno ? o.idno : ''
                    },
                    idStr = await getKey(o['xml:id'],me.dataOrg,dt);
                //récupère les relations
                if(dt.relations && dt.relations.length){
                    dt.relations.forEach(async rel=>{
                        //on stocke les relations de structure avec # pour différencier avec les structures des auteurs qui n'ont pas de #
                        await getKey(rel.active,me.dataOrg,rel);
                    })
                };
                rs.idsOrg.push(idStr);
            }
        }
               
        this.getOrgInfosByIdOrg = async function(idOrg){
            let org = keys[idOrg];            
            if(!org){
                //recherche dans HAL
                let json = await d3.json(apiHALrefStr+"/?q=docid:"+idOrg+"&wt=json&fl=*");
                if(!json.error && json.response.docs && json.response.docs.length>0){
                    let o = json.response.docs[0];
                    org = {
                        'nom':o.name_s,
                        'docid':o.docid,
                        'idOrg':idOrg,
                        'desc':o.acronym_s ? o.acronym_s:"",
                        'address':o.address_s ? o.address_s:"",
                        'country':o.country_s ? o.country_s : "",
                        "idref":o.idref_s ? o.idref_s[0] : "",
                        "rnsr":o.rnsr_s ? o.rnsr_s[0] : "",
                        "isni":o.isni_s ? o.isni_s[0] : "",
                        "ror":o.ror_s ? o.ror_s[0] : "",
                        "parents":o.parentDocid_i ? o.parentDocid_i : []
                    };
                    getKey(idOrg,me.dataOrg,org);
                    //ajoute les parents
                    org.parents.forEach(pIdOrg=>me.getOrgInfosByIdOrg(pIdOrg));
                }
            }
            return org;
        }

        this.getKeywordInfosById = async function(code,id=false){
            let kw = keys[id ? id : code];            
            if(!kw){
                //recherche dans HAL
                let url = id ? apiHALrefDom+"/?q=docid:"+id+"&wt=json&fl=*" : apiHALrefDom+"/?q=code_s:"+code+"&wt=json&fl=*",
                    json = await d3.json(url);
                /*ATTENTION il y a des différences entre l'API ref/domain et sparqlHAL : 
                il existe des subjects qui ne sont pas dans l'API
                par exemple : https://data.hal.science/subject/shs.info.hype
                */
                if(!json.error && json.response.docs && json.response.docs.length>0){
                    let o = json.response.docs[0];
                    kw = {
                        'nom':o.fr_domain_s,
                        'docid':o.docid,
                        'code':o.code_s,
                        'level':o.level_i ? o.level_i:"",
                        "parent":o.parent_i ? o.parent_i : "",
                        "type":'domain'
                    };
                    await getKey(id ? id : code,me.dataTag,kw);
                    //ajoute le parent
                    if(kw.parent){
                        await me.getKeywordInfosById(code,kw.parent);
                    }
                    kw = keys[id ? id : code];                    
                }else{
                    let arrcode = code.split('.'),
                        parentCode = arrcode.slice(0,arrcode.length-1).join('.');
                    kw = {
                        'nom':code,
                        'code':code,
                        'level':arrcode.length,
                        "type":'domain'
                    };
                    if(parentCode){
                        let parentKw = await me.getKeywordInfosById(parentCode);
                        kw.parent = me.dataTag[parentKw].docid;
                    }                   
                    await getKey(code,me.dataTag,kw);
                    kw = keys[id ? id : code];                    
                }
            }
            return kw;
        }


        function parseXml(xml, arrayTags) {
            let dom = null;
            if (window.DOMParser) dom = (new DOMParser()).parseFromString(xml, "text/xml");
            else if (window.ActiveXObject) {
                dom = new ActiveXObject('Microsoft.XMLDOM');
                dom.async = false;
                if (!dom.loadXML(xml)) throw dom.parseError.reason + " " + dom.parseError.srcText;
            }
            else throw new Error("cannot parse xml string!");

            function parseNode(xmlNode, result) {
                if (xmlNode.nodeName == "#text") {
                    let v = xmlNode.nodeValue;
                    if (v.trim()) result['#text'] = v;
                    return;
                }

                let jsonNode = {},
                    existing = result[xmlNode.nodeName];
                if (existing) {
                    if (!Array.isArray(existing)) result[xmlNode.nodeName] = [existing, jsonNode];
                    else result[xmlNode.nodeName].push(jsonNode);
                }
                else {
                    if (arrayTags && arrayTags.indexOf(xmlNode.nodeName) != -1) result[xmlNode.nodeName] = [jsonNode];
                    else result[xmlNode.nodeName] = jsonNode;
                }

                if (xmlNode.attributes) for (let attribute of xmlNode.attributes) jsonNode[attribute.nodeName] = attribute.nodeValue;

                for (let node of xmlNode.childNodes) parseNode(node, jsonNode);
            }

            let result = {};
            for (let node of dom.childNodes) parseNode(node, result);

            return result;
        }        

        this.getSparqlAuteursInterest = async function(idHal){
            let qInt = `SELECT ?int
, ?pl
, ?scheme
, ?id
WHERE {
<https://data.archives-ouvertes.fr/author/`+idHal+`> foaf:interest ?int.
?int skos:prefLabel ?pl filter (lang(?pl) = "fr").
?int skos:inScheme ?scheme.
?int dc:identifier ?id
}`,
                qTopInt = `SELECT ?ti WHERE {
                    <https://data.archives-ouvertes.fr/author/`+idHal+`> foaf:topic_interest ?ti filter (lang(?ti) = "fr")
                }`,
            ints = await getSparqlData(qInt),
            topics = await getSparqlData(qTopInt),
            rs = {
                'interests':ints.results.bindings.map(i=>{return {"nom":i.pl.value,"id":i.id.value,"uri":i.int.value};})
                ,'topics':topics.results.bindings.map(i=>i.ti.value)
            };
            //enregistre les mots clefs dans les tags
            for(let i=0;i<rs.interests.length;i++){
                let kw = rs.interests[i];
                await getKey('domainAllCode_s'+kw.id,me.dataTag,{'type':'domainAllCode_s','val':kw.id});
            }
            for(let i=0;i<rs.topics.length;i++){
                let kw = rs.topics[i];
                await getKey('keyword_s'+kw,me.dataTag,{'type':'keyword_s','val':kw});
            }
            return rs;
        }
        
        async function getSparqlData(query) {
            let url = sparqlHAL+encodeURIComponent(query),
                rs = await d3.json(url);
            return rs;
        }

        function saveFile(fileContent,fileName){
            var bb = new Blob([fileContent ], { type: 'text/plain' });
            var a = document.createElement('a');
            a.download = fileName;
            a.href = window.URL.createObjectURL(bb);
            a.click();
        }
        this.init();
    
    }
}