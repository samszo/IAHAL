import {dataHAL} from './dataHAL.js';     
import {loader} from './loader.js';   
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import Panzoom from '../../node_modules/@panzoom/panzoom/dist/panzoom.es.js';

export class worflow {
    constructor(params={}) {
        var me = this;
        this.auth = params.auth ? params.auth : false;
        this.wait = new loader();
        this.cont = params.cont ? params.cont : d3.select('body');
        this.data = params.data ? params.data : false;
        var graph;

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
            this.cont.append('h4').html(this.data.label);
            initMermaid();

        }

        function clearMermaid(){
            me.cont.selectAll('pre').remove();
            graph = me.cont
                .append('pre').attr('id','mermaidGraph').attr("class","mermaid");
        }
        function initMermaid(){
            clearMermaid();
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
            //ajoute l'intéraction avec les éléments
            d3.select(svgElement).selectAll('g.node').style('cursor','pointer')
                .on('click', function(event, d) {
                    let id = d3.select(this).attr('id').replace('flowchart-','');
                    //'flowchart-PE_2241-55'
                    console.log(id);
                });                    
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
