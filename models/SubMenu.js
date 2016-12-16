/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('SubMenu', {
    Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    ObjType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "2"
    },
    IdMenu: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    OpMenu: {
      type: DataTypes.STRING,
      allowNull: false
    },
    Pos: {
      type: "NUMERIC",
      allowNull: false
    },
    Imagen: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Idioma: {
      type: DataTypes.STRING,
      allowNull: false
    },
    Activo: {
      type: "BIT",
      allowNull: true
    }
  }, {
    tableName: 'SubMenu'
  });
};
