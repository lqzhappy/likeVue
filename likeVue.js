//LikeVue，作者：傲树  2019-09-13  version:0.01
(function(){
    'use strict';
    function Register(name){
        this.name = name;
        this.nodes = [];
    }
    function RegisterStore(likeVue){//表单双向绑定仓库
        this.reg_store = [];
        if(typeof RegisterStore.__init == 'undefined'){
            RegisterStore.__init = true;
            RegisterStore.prototype.addRegister=function(node){//添加属性与表单元素关联，即视图->属性
                var name = node.dataset['model'];
                if(typeof name == 'undefined'){//该表单元素未设置绑定，跳过
                    return;
                }
                switch(node.type){
                    case 'textarea':
                    case 'text':
                        node.addEventListener('input',function(){
                            likeVue[name] = node.value;
                        });
                        break;
                    case 'select-one':
                        node.addEventListener('change',function(){
                            likeVue[name] = node.value;
                        });
                        break;
                    case 'radio':
                        node.addEventListener('click',function(){
                            likeVue[name] = node.value;
                        });
                        break;
                    case 'checkbox':
                        node.addEventListener('click',function(){
                            var index = likeVue[name].indexOf(node.value);
                            if(this.checked){
                                if(index == -1){//不存在执行添加
                                    likeVue[name].push(node.value);
                                }
                            }
                            else{
                                if(index != -1){//存在则执行删除
                                    likeVue[name].splice(index,1);
                                }
                            }
                        });
                        break;
                }
                for(var i=0;i<this.reg_store.length;i++){
                    if(this.reg_store[i].name == name){
                        this.reg_store[i].nodes.push(node);
                        return;
                    }
                }
                var register = new Register(name);
                register.nodes.push(node);
                this.reg_store.push(register);
            }
            RegisterStore.prototype.getNodeListByName=function(name){//获取对应名称关联的表单节点列表
                for(var i=0;i<this.reg_store.length;i++){
                    if(this.reg_store[i].name == name){
                        return this.reg_store[i].nodes;
                    }
                }
                return null;
            }
            RegisterStore.prototype.toFormView=function(name,value){//输出到表单元素，属性->视图
                if(!name){
                    return;
                }
                var aboutNodes = this.getNodeListByName(name);
                if(aboutNodes){
                    for(var i=0;i<aboutNodes.length;i++){
                        if(aboutNodes[i].type == 'radio'){
                            aboutNodes[i].checked = aboutNodes[i].value == value;
                            continue;
                        }
                        if(aboutNodes[i].type == 'checkbox'){
                            if(likeVue[name] instanceof Array == false){
                                likeVue[name] = value = [];
                                if(likeVue.warning){
                                    console.warn('[LikeVue]警告：checkbox数组值不正确，已强制转换为[]');
                                }
                            }
                            aboutNodes[i].checked = value.indexOf(aboutNodes[i].value) != -1;
                            continue;
                        }
                        aboutNodes[i].value = value;
                    }
                }
            }
        }
    }
    function _LikeVue(param){
        if(!param){
            throw new Error("[LikeVue]错误：初始化参数不能为空！");
        }
        if(!param.el){
            throw new Error("[LikeVue]错误：未设置作用区域！");
        }
        if(!param.data){
            throw new Error("[LikeVue]错误：数据设置不能为空！");
        }
        if(param.methods && typeof param.methods != 'object'){
            throw new Error('[LikeVue]错误：methods必须为对象！');
        }
        this.warning = true;//警告开关
        var nodes = [];//保存节点数组
        var sourceText = [];//保存字符串模版列表
        var dom = document.querySelector(param.el);
        if(!dom){
            throw new Error("[LikeVue]错误：无法找到el所指定的区域！");
        }
        var rs = new RegisterStore(this);
        var nodeList = [];
        if(typeof _LikeVue.__init == 'undefined'){
            _LikeVue.__init = true;
            _LikeVue.prototype.init = function(){
                this.analyze();      
                var that = this;
                for(var attr in param.data){//添加数据单向绑定
                    (function(innerAttr){//建立与外界通道
                        Object.defineProperty(that,innerAttr,{
                            enumerable:true,
                            configurable:false,
                            set:function(x){
                                param.data[innerAttr] = x;
                            },
                            get:function(){
                                return param.data[innerAttr];
                            }
                        });
                        var value = param.data[innerAttr];
                        Object.defineProperty(param.data,innerAttr,{
                            enumerable:true,
                            configurable:false,
                            set:function(x){
                                this['$'+innerAttr] = x;
                                that.renderAllNode(innerAttr,param.data);
                                rs.toFormView(innerAttr,x);
                            },
                            get:function(){
                                return this['$'+innerAttr];
                            }
                        });
                        param.data[innerAttr] = value;
                    })(attr);
                }
            }
            _LikeVue.prototype.eventNames = ['click','dblclick','input','blur','hover'];
            _LikeVue.prototype.analyze=function(){//解析器
                this.getAllNodeList(dom,nodeList);
                console.log(nodeList);
                var that = this;
                for(var i=0;i<nodeList.length;i++){  
                    if(this.isForm(nodeList[i])){//添加表单双向绑定
                        rs.addRegister(nodeList[i]);
                    }
                    if(nodeList[i].nodeType==3 && this.checkExist(nodeList[i].textContent)){//检索动态文本节点
                        nodes.push(nodeList[i]); 
                        sourceText = sourceText.concat(nodeList[i].textContent);
                    }
                    if(nodeList[i].nodeType == 1){//检索事件
                        var data=nodeList[i].dataset;
                        for(var x in data){
                            if(x.trim().substring(0,2)=='on'){
                                var index = x.indexOf(':');
                                if( index != -1){
                                    var action = x.substring(index+1,x.length).trim();
                                    if(this.eventNames.indexOf(action) == -1){
                                        throw new Error('[LikeVue]错误：监听事件名称错误！');
                                    }
                                    if(!param.methods){
                                        continue;
                                    }
                                    if(typeof param.methods[data[x]] != 'function'){
                                        throw new Error('[LikeVue]错误：事件函数'+data[x]+'不正确！');
                                    }
                                    (function(fun){
                                        nodeList[i].addEventListener(action,function(){
                                            fun();
                                        });
                                    })(param.methods[data[x]].bind(that));
                                }
                                else{
                                    throw new Error('[LikeVue]错误：事件设置错格式错误！');
                                }
                                continue;
                            }
                            
                        }
                    }
                }
                nodeList = null; 
            }
            
            _LikeVue.prototype.isForm=function(node){//判断是否表单元素
                var names = ['INPUT','SELECT','BUTTON','TEXTAREA'];
                for(var i=0;i<names.length;i++){
                    if(node.tagName==names[i]){
                        return true;
                    }
                }
                return false;
            }
            _LikeVue.prototype.getAllNodeList=function(node,list){
                var nodes = node.childNodes;
                if(nodes.length<1){//无子节点，结束递归
                    return;
                }
                for(var i=0;i<nodes.length;i++){
                    list.push(nodes[i]);
                    this.getAllNodeList(nodes[i],list);
                }   
            }
            _LikeVue.prototype.renderAllNode = function(attr){//渲染所有相关节点
                for(var i=0;i<nodes.length;i++){
                    if(this.checkExist(sourceText[i])){//检测未定义属性
                        var names = this.getAttrNames(sourceText[i]);
                        for(var j=0;j<names.length;j++){
                            if(!param.data.hasOwnProperty(names[j])){
                                throw new Error("[LikeVue]错误：属性["+names[j]+"]被引用，但并未定义！");
                            }
                        }
                    }else{//无模版，跳过剩下
                        continue;
                    }
                    if(this.checkExist(sourceText[i],attr)){
                        nodes[i].textContent = this.renderNode(attr,sourceText[i],param.data);
                    }
                }
            }
            _LikeVue.prototype.renderNode=function(attr,exp){//渲染单节点
                var text = exp;
                if(this.checkExist(text,attr)){
                    var names = this.getAttrNames(text);
                    for(var i=0;i<names.length;i++){
                        text = text.replace(new RegExp("\\{{2}\\s*"+names[i]+"\\s*\\}{2}",'g'),param.data['$'+names[i]]);
                    }
                }
                return text;
            }
            _LikeVue.prototype.getAttrNames=function(str){//获取字符串所有属性名称列表
                if(!str)
                    return null;
                var list = str.match(/\{{2}[\s,\S]*?\}{2}/g);
                if(list == null)
                    return null;
                for(var i=0;i<list.length;i++){
                    list[i] = list[i].substring(2,list[i].length-2).trim();
                }
                return list;
            }
            _LikeVue.prototype.checkExist=function(str,attr){//检测是否存在模版元素
                if(!str){
                    return false;
                }
                var reg = '\\{{2}[\\s,\\S]*?\\}{2}';
                if(attr !== undefined){
                    reg = '\\{{2}\\s*'+ attr +'\\s*\\}{2}';
                }
                var list = str.match(new RegExp(reg,'g'));
                return list !== null;
            }
        }
        this.init();   
    }
    window.LikeVue = _LikeVue;
})();
