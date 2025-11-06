import {dataHAL} from './dataHAL.js';     
import {loader} from './loader.js';   
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import Panzoom from '../../node_modules/@panzoom/panzoom/dist/panzoom.es.js';
import {JSONPath} from '../../node_modules/jsonpath-plus/dist/index-browser-esm.js';

export class worflow {
    constructor(params={}) {
        var me = this;
        this.auth = params.auth ? params.auth : false;
        this.wait = new loader();
        this.cont = params.cont ? params.cont : d3.select('body');
        this.data = params.data ? params.data : false;
        this.hal = new dataHAL({});
        var graph, colorDeb = "#dc3545", colorFin = "#043e27ff", colorWait = "#2f2066ff",
            steps={};
        this.init = function () {
            if(!this.data)return;
            mermaid.initialize({ startOnLoad: false,theme: 'dark', });
            //ajoute le pack d'icones
            mermaid.registerIconPacks([
                {
                  name: 'fa',
                  loader: () =>
                    fetch('https://unpkg.com/@iconify-json/fa@1/icons.json').then((res) => res.json())
                },
              ]);
            initMermaid();
        }

        function clearMermaid(){
            me.cont.select('h4').remove();
            me.cont.select('p').remove();
            me.cont.selectAll('pre').remove();
        }
        function initMermaid(){
            clearMermaid();
            me.cont.append('h4').html(me.data.label);
            me.cont.append('p').html('Cliquez sur le bloc rouge pour commencer');
            graph = me.cont
                .append('pre').attr('id','mermaidGraph').attr("class","mermaid");
            d3.text(me.data.mermaid).then(text=>{
                generateMermaid(text);
            }).catch(err=>{
                console.log("Erreur de chargement du worflow mermaid", err);
                initDefaultMermaid();
            })
        }
        function initDefaultMermaid(){
            let graphCode = `
                        %%{
                            init: {
                            'theme': 'neutral'
                            }
                        }%%
                        flowchart TD
                        Start[Sélectionner un workflow dans le menu]
                        `;
            generateMermaid(graphCode);
        }            
        function generateMermaid(graphCode){
            graph.html(graphCode);
            mermaid.run({
                querySelector: '#mermaidGraph',
                postRenderCallback: (id) => {
                    const svgElement = graph.node().querySelector("svg");
            
                    // Initialize Panzoom
                    const panzoomInstance = Panzoom(svgElement, {
                        maxScale: 5,
                        minScale: 0.5,
                        step: 0.1,
                    });
            
                    // Add mouse wheel zoom
                    graph.node().addEventListener("wheel", (event) => {
                        panzoomInstance.zoomWithWheel(event);
                    });
                    addInteractivity(svgElement);
                }
            });            
        }


        function addInteractivity(svgElement){
            //initialise les étapes
            steps = {};
            //ajoute l'intéraction avec les éléments
            me.data.steps.forEach((ev,i)=>{
                let sBloc=d3.select(ev.path);
                if(ev.event=="click"){
                    //ajoute l'événement au clic
                    sBloc.on('click', (e,d)=> {
                            ev.function ? execEvent(ev,i) : null;
                        })
                }
                //modifie les couleurs des blocs
                sBloc.attr('style',"fill:"+(ev.function=="start"?colorDeb:colorWait)+";").style('cursor','pointer');            
            });

        }

        async function execEvent(ev, i){
            console.log("execEvent", ev);
            if(steps[i])return;   
            steps[i]=ev;                 
            let nextStep = me.data.steps[i+1];
            switch (ev.function) {
                case "start":
                    d3.select(ev.path).attr('style',"fill:"+colorFin+";")
                    execEvent(nextStep,i+1);
                    break;            
                case "loadJSON":
                    ev.jsons.forEach((js,j)=>{
                        d3.select(js.path).attr('style',"fill:"+colorDeb+";");
                    });
                    Promise.all(ev.jsons.map(js=>d3.json(js.url))).then(values=>{
                        ev.jsons.forEach((js,j)=>{
                            js.data = values[j];
                            d3.select(js.path).attr('style',"fill:"+colorFin+";");
                            if(j == ev.jsons.length -1 ){
                                d3.select(ev.path).attr('style',"fill:"+colorFin+";");
                                execEvent(nextStep,i+1);
                            } 
                        });
                    })                        
                    break;  
                case "dataHalToOmk":
                    d3.select(ev.path).attr('style',"fill:"+colorDeb+";");
                    ev.params.forEach(async p=>{
                        //pour les tests
                        if(p.rt!="structure" && p.rt!="concept" && p.rt!="auteur")
                            await addDataHalToOmk(p);
                        if(p==ev.params[ev.params.length -1]){
                            d3.select(ev.path).attr('style',"fill:"+colorFin+";");
                            execEvent(nextStep,i+1);
                        }
                    });
                    break;  
                case "dataOmkLoaded":
                    d3.select(ev.path).attr('style',"fill:"+colorFin+";");
                    execEvent(nextStep,i+1);
                    break;  
                case "showItems":
                    d3.select(ev.path).attr('style',"fill:"+colorDeb+";");
                    ev.params.forEach(async p=>{
                        await showDataOmk(p);
                        if(p==ev.params[ev.params.length -1]){
                            d3.select(ev.path).attr('style',"fill:"+colorFin+";");
                            execEvent(nextStep,i+1);
                        }
                    });
                    break;                      
                case "replaceIds":
                    //pour les tests
                    if(p.rt!="structure" && p.rt!="concept" && p.rt!="auteur"){
                        ev.params.forEach(async p=>{
                            d3.select(p.path[0]).attr('style',"fill:"+colorDeb+";");
                            d3.select(p.path[2]).attr('style',"fill:"+colorDeb+";");
                            await replaceIds(p,false,0);
                            if(p==ev.params[ev.params.length -1]){
                                execEvent(nextStep,i+1);
                            }
                        });
                    }
                    break;                      
                default:
                    break;
            }

        }

        async function replaceIds(p,dtDst,idDst){
            dtDst = dtDst ? dtDst : JSONPath({path: p.pathData, json: me.data});
            let d = dtDst[idDst]; 
            //replace les ids
            await d3.select(p.path[1]).attr('style',"fill:"+colorDeb+";");
            p.replace.forEach(r=>{
                let dtHal = JSONPath({path: r.pathSrc, json: d});
                dtHal.forEach(src=>{
                    let dtSrc = me.auth.omk.searchItems(r.omkSrc+src,false,true,'replaceIds-'+r.dst+src);
                    if(dtSrc && dtSrc.length>0){
                        if(d[r.dst]==undefined)d[r.dst]=[];
                        d[r.dst].push({'rid':dtSrc[0]["o:id"]});
                    }else{
                        console.log("Aucun item OMK trouvé pour :"+r.omkSrc+src, p);
                    }
                })
            })
            await d3.select(p.path[0]).attr('style',"fill:"+colorFin+";");
            //ajoute l'item dans omk
            await setOmkItems([d], 0, {'rt':p.rt});
            await d3.select(p.path[1]).attr('style',"fill:"+colorFin+";");
            console.log("Item mis à jour dans OMK avec les nouveaux ids :"+idDst, d);
            if(idDst < dtDst.length -1 ){
                await replaceIds(p,dtDst,idDst+1);
            }else{
                await d3.select(p.path[2]).attr('style',"fill:"+colorFin+";");
                return idDst;
            }
        }



        async function showDataOmk(p){
            let dtOmk = JSONPath({path: p.pathData, json: me.data});
            console.log("showDataOmk",dtOmk);
            /*
            if(dtOmk.length>0){
                let cont = d3.select('#resultQuery');
                cont.selectAll('div').remove();
                setTable(dtOmk,cont);
            }
            */
        }

        async function addDataHalToOmk(p){
            let dtHal = JSONPath({path: p.pathData, json: me.data});
            if(dtHal.length>0)  await setOmkItems(dtHal[0], 0, p);
        }

        async function setOmkItems(data, i, p){            
            let h = data[i], dtOmk={};
            console.log("Création dans OMK de l'item :"+i, h);
            switch(p.rt){
                case "structure":
                    //création des relations
                    await setOmkItemsRelations(h.parents, 0, p, "[?(@.idOrg==='");
                    //crée le template de données OMK
                    dtOmk = getOmkDataTemplate(h,p);
                    //ajoute l'item dans omk
                    h.omk = await me.auth.omk.getsetResource(dtOmk); 
                    break;
                case "concept":
                    h.parent = h.parent ? await setOmkItemsRelations(h.parent, 0, p, "[?(@.docid==='") : false;
                    dtOmk = getOmkDataTemplate(h,p);
                    h.omk = await me.auth.omk.getsetResource(dtOmk);
                    break;
                case "depots":
                    dtOmk = {};
                    break;                
                default:
                    dtOmk = getOmkDataTemplate(h,p);
                    h.omk = await me.auth.omk.getsetResource(dtOmk);
                    break;
            }
            if(i < data.length -1 ){
                return await setOmkItems(data, i+1, p);
            }else{
                return data[i];
            }                           
        }

        async function setOmkItemsRelations(data, i, p, q){
            if(!data || data.length==0)return false;
            if(!Array.isArray(data))data=[data];
            if(typeof data[i] === 'object')return data[i].parent;
            let hRs = JSONPath({path: p.pathData+q+data[i]+"')]", json: me.data});
            if(hRs.length>0){
                //ajoute la relation
                data[i] = await setOmkItems(hRs, 0, p);                            
                console.log("Structure créée dans OMK pour la relation :", data[i]);                            
            }else{
                console.log("Aucune structure trouvée pour la relation :", data[i]);
                //recherche dans HAL
                let rHal = await me.hal.getOrgInfosByIdOrg(data[i]);
                data[i] =  await setOmkItems([rHal], 0, p);
                console.log("Structure créée dans OMK pour la relation :", data[i]);                            
            }
            if(i < data.length -1 ){
                return await setOmkItemsRelations(data, i+1, p, q);
            }else{
                return data[i];
            }
        }

        function getOmkDataTemplate(h,p){
            let dtOmk={};
            switch(p.rt){
                case "structure":
                    dtOmk = {'rt':'structure','c':'org:Organization',
                            'dt':{"skos:prefLabel":h.nom,
                                "skos:altLabel":h.desc,
                                "org:identifier":h.id,
                                "dcterms:identifier":h.idOrg,
                                "org:siteAddress":h.address,
                                "vcard:country-name":h.country,
                                "org:unitOf":h.parents.length ? h.parents.map(p=>{return {'rid':p.omk["o:id"]};}) : "",
                                "org:classification":h.type,
                                "hal:idref":h.idRef,
                                "hal:rnsr":h.idRnsr,
                                "hal:isni":h.idIsni,
                                "hal:ror":h.idRor   
                            },
                            'verif':{'dcterms:identifier':h.idOrg},
                            'index':'dcterms:identifier'+h.idOrg};
                    break;
                case "auteur":
                    dtOmk = {'rt':'auteur','c':'foaf:Person',
                            'dt':{"foaf:name":h.full && h.full.fullName_s ? h.full.fullName_s : h.prenom+" "+h.nom,
                                "foaf:firstName":h.prenom,
                                "foaf:familyName":h.nom,
                                "dcterms:identifier":h.full && h.full.idHal_s ? h.full.idHal_s : "",
                                "dcterms:isReferencedBy":h.full && h.full.person_i ? h.full.person_i+"" : h.prenom+"_"+h.nom,
                                "hal:idref":h.full && h.full.idrefId_s ? h.full.idrefId_s[0] : "",
                                "hal:orcid":h.full && h.full.orcidId_s ? h.full.orcidId_s[0] : "",
                                "hal:isni":h.full && h.full.isniId_s ? h.full.isniId_s[0] : "",
                                "hal:viaf":h.full && h.full.viafId_s ? h.full.viafId_s[0] : "",
                                "foaf:member":h["foaf:member"] ? h["foaf:member"] : "",
                                "foaf:interest":h["foaf:interest"] ? h["foaf:interest"] : "",
                                "foaf:topic_interest":h["foaf:topic_interest"] ? h["foaf:topic_interest"] : "",
                            },
                            'verif':{"dcterms:isReferencedBy":h.full && h.full.person_i ? h.full.person_i+"" : h.prenom+"_"+h.nom},
                            'index':"auteur"+(h.full && h.full.person_i ? h.full.person_i : h.prenom+"_"+h.nom)
                        };
                    break;
                case "concept":
                    dtOmk = {'rt':'concept','c':'skos:Concept',
                            'dt':{"skos:prefLabel":h.val ? h.val : h.nom,
                                "dcterms:description":h.code ? h.code : "",
                                "dcterms:identifier":h.docid ? h.docid : "",
                                "skos:broader":h.parent ? {'rid':h.parent.omk["o:id"]} : "",
                                "skos:inScheme":h.type ? h.type.replace("_s","") : "domaine",
                            },
                            'verif':{'skos:prefLabel':(h.val ? h.val : h.nom),"skos:inScheme":h.type ? h.type.replace("_s","") : "domaine"},
                            'index':(h.type ? h.type.replace("_s",""):"domaine")+"concept"+(h.val ? h.val : h.nom)
                        };
                    break;
                case "depots":
                    dtOmk = {};
                    break;                
                default:
                    dtOmk = {};
                    break;
            }
            return dtOmk;
        }   

        function execQuery(q){
            let url = q.substring(0,1)=="?" ?apiHAL+q : apiHAL+"?"+q 
            queryHALold = queryHALold == "" ? url : queryHAL; 
            queryHAL = url;
            d3.json(queryHAL).then(data=>{
                let cont = d3.select('#resultQuery');
                cont.selectAll('div').remove();
                rsHal = new dataHAL({'urlData':queryHAL,'showLoader':showLoader,'hideLoader':hideLoader});
                setTable(data.response.docs,cont);
            })
        }
        this.init();
    }
}
