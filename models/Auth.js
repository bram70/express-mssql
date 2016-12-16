/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Auth', {
    Id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ObjType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "3"
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    PermId: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    Permission: {
      type: DataTypes.CHAR,
      allowNull: true,
      defaultValue: "N"
    },
    Activo: {
      type: "BIT",
      allowNull: false
    }
  }, {
    tableName: 'Auth'
  });
};
