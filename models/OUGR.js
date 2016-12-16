/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('OUGR', {
    Id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    GroupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    GroupName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    GroupDec: {
      type: DataTypes.STRING,
      allowNull: true
    },
    TPLId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Activo: {
      type: "BIT",
      allowNull: true
    }
  }, {
    tableName: 'OUGR'
  });
};
