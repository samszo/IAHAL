export class modal {
    constructor(params={}) {
        var me = this;
        this.id = params.id ? params.id : "UserModal";
        this.titre = params.titre ? params.titre : "Message";
        this.body = params.body ? params.body : "";
        this.boutons = params.boutons ? params.boutons : [{'name':"Close"}];
        this.size = params.size ? params.size : '';
        this.class = params.class ? params.class : '';
        var m, mBody, mFooter;
        this.init = function () {
            //ajoute la modal pour les messages
            let html = `
                <div class="modal-dialog ${me.size}">
                <div class="modal-content ${me.class}">
                    <div class="modal-header">
                    <h5 class="modal-title">${me.titre}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                    ${me.body}                    
                    </div>                          
                    <div class="modal-footer">
                    </div>
                </div>
                </div>
            `;
            d3.select('#modal'+me.id).remove();
            let sm = d3.select('body').append('div')
                .attr('id','modal'+me.id).attr('class','modal').attr('tabindex',-1);
            sm.html(html);
            m = new bootstrap.Modal('#modal'+me.id);
            mBody = sm.select('.modal-body');
            mFooter = sm.select('.modal-footer');
            me.setBoutons();
        }
        this.setBoutons = function(boutons=false){
            if(boutons)me.boutons=boutons;
            mFooter.selectAll('button').remove();
            me.boutons.forEach(b=>{
                switch (b.name) {
                    case 'Close':
                        mFooter.append('button').attr('type',"button").attr('class',"btn btn-secondary")
                            .attr('data-bs-dismiss',"modal").html(b.name);
                        break;                
                    default:
                        mFooter.append('button').attr('type',"button").attr('class',"btn "+b.class)
                            .on('click',b.fct).html(b.name);
                        break;
                }
            })
        }
        this.add = function(p){
            let s=d3.select('#'+p);
            //ajoute la modal si inexistant
            if(s.empty()){
                s = d3.select('body').append('div')
                    .attr('id',p).attr('class','modal').attr('tabindex',-1);
                s.html(eval(p));
            }
            return {'m':new bootstrap.Modal('#'+p),'s':s};
        }
        this.setBody = function(html){
            mBody.html(html);
        }
        this.show = function(){
            m.show();
        }
        this.hide = function(){
            m.hide();
        }

        this.init();
    }
}
//modal pour ajouter un commentaire 
export let modalAddComment = `
    <div class="modal-dialog modal-xl">
    <div class="modal-content">
        <div class="modal-header text-bg-warning">
        <h5 class="modal-title">Ajouter un commentaire</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body text-bg-dark">
            <h4 id="inptTitreNote"></h4>
            <div id="modParole" class="row mb-3"></div> 
            <div class="text-center">       
                <img id="imgAddComment" src="" class="img-fluid" alt="Responsive image">
            </div>                          
        </div>                          
        <div class="modal-footer text-bg-warning">
            <button id="btnAddCommentClose" type="button" class="btn btn-secondary">Fermer</button>        
            <button id="btnAddCommentDelete" type="button" class="btn btn-danger">Supprimer</button>        
            <button id="btnAddCommentSave" type="button" class="btn btn-success">Enregistrer</button>        
        </div>
    </div>
    </div>
`;
