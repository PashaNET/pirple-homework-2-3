
/**
 * Module responsible for creating html templates for pages
 */

//Dependencies 
const fs = require('fs'),
      path = require('path'),
      config = require('../config'),
      validators = require('../servises/validators');
const menu = require('../models/MenuItem'),
      shoppingCart = require('../models/ShoppingCart');

let pageHandlers = {
    favicon: faviconHandler,
    public: assetHandler,
    index: indexHandler,
    account: accountHandler,
    login: loginHandler,
    menu: menuHandler,
    cart: cartHandler
}

function assetHandler(data, callback){ 
    //only 'get' method allowed
    if(data.method == 'get'){
        let assetName = data.path.replace('public', '');
        let pathToAsset = path.join(__dirname, '../../public', assetName);
        fs.readFile(pathToAsset, (err, stringPayload) => {
            if(!err){
                //get the extension to define the content type 
                let contentType = assetName.split('.').pop();

                callback(200, stringPayload, contentType);
            } else {
                callback(500, err, 'plain');
            }
        });
    } else {
        callback(403, {message: 'Method not allowed'}, 'html');
    }
}

function faviconHandler(data, callback){ 
    //
    if(data.method == 'get'){
        let pathToAsset = path.join(__dirname, '../../', 'favicon.ico');
        fs.readFile(pathToAsset, (err, stringPayload) => {
            if(!err){
                callback(200, stringPayload, 'favicon');
            } else {
                callback(500, err, 'plain');
            }
        });
    } else {
        callback(403, {message: 'Method not allowed'}, 'html');
    }
}

function indexHandler(data, callback){
    let pageName = 'index';
    let indexData = {
        class: 'index',
        title: 'Home',
        header: 'Hello friend!',
        text: 'This is the best internet shop. Please login or signup to see list of goods.'
    };

    getTemplate(pageName, indexData, (err, template) => {
        if(!err){
            callback(false, template, 'html');
        } else {
            callback(true, err, 'html');
        }
    });
}

function accountHandler(data, callback){
    let pageName = 'account';
    let indexData = {
        class: 'account',
        title: 'Create account',
        header: 'Please fill all fields and press \'Create\'',
        text: 'This is the best internet shop. Please login or signup to see list of goods.'
    };

    getTemplate(pageName, indexData, (err, template) => {
        if(!err){
            callback(false, template, 'html');
        } else {
            callback(true, err, 'html');
        }
    });
}

function loginHandler(data, callback){
    let pageName = 'login';
    let indexData = {
        class: 'login',
        title: 'Login',
        header: 'Put your email and password to get the access to your accoutn'
    };

    getTemplate(pageName, indexData, (err, template) => {
        if(!err){
            callback(false, template, 'html');
        } else {
            callback(true, err, 'html');
        }
    });
}

function menuHandler(data, callback){
    let pageName = 'menu/menu',
        itemTemplate = 'menu/item',
        indexData = {
            class: 'menu',
            title: 'Products',
            header: 'Our best products'
        };

    let pathToTemplate = path.join(__dirname, itemTemplate + '.html');
    //get template for single item
    fs.readFile(pathToTemplate, 'utf8', (err, str) => {
        if(!err){
            //read items from database
            menu.getAll((err, message, items) => {
                if(!err){
                    let listTemplate = '';
                    //fill template for every item with values
                    items.forEach((item) => {
                        listTemplate += interpolate(str, item);
                    });
                    //get universal template
                    getTemplate(pageName, indexData, (err, template) => {
                        if(!err){
                            //replace holder for items with created template
                            let templateWithItems = template.replace('{goodsList}', listTemplate);
                            callback(false, templateWithItems, 'html');
                        } else {
                            callback(true, err, 'html');
                        }
                    });
                } else {
                    callback(400, {message: message});
                }
            });
        } else {
            callback(true, err, 'html');
        }
    });
}

function cartHandler(data, callback){
    let pageName = 'cart/cart',
    itemTemplate = 'cart/item',
    indexData = {
        class: 'cart',
        title: 'Cart',
        header: 'Cart list',
        scripts: ['/public/cart.js']//TODO implement possibility to add scripts to pages
    };

    let pathToTemplate = path.join(__dirname, itemTemplate + '.html');

    //get template for single cart item
    fs.readFile(pathToTemplate, 'utf8', (err, str) => {
        if(!err){
            //read items from database
            shoppingCart.getById(data.payload.id, (err, message, cart) => {
                let listTemplate = "<p>There is no items in your cart</p>"
                if(!err){
                    if(cart.items.length > 0) {
                        listTemplate = '';
                        //fill template for every item with values
                        cart.items.forEach((item) => {
                            listTemplate += interpolate(str, item);
                        });
                    }

                    //get universal template
                    getTemplate(pageName, indexData, (err, template) => {
                        if(!err){
                            //replace holder for items with created template
                            let templateWithItems = template.replace('{cartList}', listTemplate);
                            callback(false, templateWithItems, 'html');
                        } else {
                            callback(true, err, 'html');
                        }
                    });
                } else {
                    callback(true, listTemplate + message, 'html');
                }
            });
        } else {
            callback(true, listTemplate, 'html');
        }
    });
}

function getTemplate(pageName, pageData, callback){
    let pathToTemplate = path.join(__dirname, pageName + '.html');

    fs.readFile(pathToTemplate, 'utf8', (err, str) => {
        if(!err){
            addUniversalTemplateParts(str, (err, fullTemplateStr) => {
                if(!err){
                    let finalStr = interpolate(fullTemplateStr, pageData);
                    callback(false, finalStr);
                } else {
                    callback(err, {message: 'Can\'t read universal templates'});
                }
            });
        } else {
            callback(err, {message: 'Can\'t read template file'});
        }
    });
}

function addUniversalTemplateParts(templateStr, callback){
    let pathToHeaderTemplate = path.join(__dirname, 'layout', 'header.html');
    fs.readFile(pathToHeaderTemplate, 'utf8', (err, headerStr) => {
        if(!err){
            let pathToFooterTemplate = path.join(__dirname, 'layout', 'footer.html');
            fs.readFile(pathToFooterTemplate, 'utf8', (err, footerStr) => {
                if(!err){
                    callback(false, headerStr+templateStr+footerStr);
                } else {
                    callback(err, {message: 'Can\'t read footerTemplate'});
                }
            });
        } else {
            callback(err, {message: 'Can\'t read headerTemplate'});
        }
    });
}

/**
 * replace keys in template with their values
 * @param {*} params 
 */
function interpolate(template, params){
    let globalParams = config.globalTemplateData;

    //replace global variables 
    for(let key in globalParams){
        if(globalParams.hasOwnProperty(key)){
            let find = '{global.' + key + '}';
            template = template.replace(find, globalParams[key]);
        }
    }

    //replace all related to page variables
    for(let key in params){
        if(params.hasOwnProperty(key)){
            let find = '{' + key + '}';
            template = template.split(find).join(params[key]);
        }
    }

    return template;
}


module.exports = pageHandlers;