/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('BotoneraMenu', {
    Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    ObjType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "4"
    },
    IdMenu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: "1"
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
    tableName: 'BotoneraMenu'
  });
};
