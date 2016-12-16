/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ExCHRate', {
    RateDate: {
      type: DataTypes.DATE,
      allowNull: false,
      primaryKey: true
    },
    Currency: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    Rate: {
      type: "NUMERIC",
      allowNull: true
    },
    UserSign: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'ExCHRate'
  });
};
