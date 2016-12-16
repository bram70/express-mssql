var express = require('express');
var router = express.Router();
var models = require('../models');

models.Menu.hasMany(models.SubMenu, {foreignKey: 'idMenu'});
models.SubMenu.belongsTo(models.Menu, {foreignKey: 'idMenu'});

/* GET home page. */
router.get('/', function(req, res, next) {
  models.Menu.find({
    include:[
      { model: models.SubMenu, required: true}
    ]
  }).then(function(menus){
        res.render('index', { title: 'Express', menu: menus });
        //res.json(menus);
      }
  );
});

module.exports = router;
