/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('OUSR', {
    USERID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    PASSWORD: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "0"
    },
    INTERNAL_K: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    USER_CODE: {
      type: DataTypes.STRING,
      allowNull: false
    },
    U_NAME: {
      type: DataTypes.STRING,
      allowNull: true
    },
    GROUPS: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: "((0))"
    },
    SUPERUSER: {
      type: DataTypes.CHAR,
      allowNull: true,
      defaultValue: "N"
    },
    E_Mail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Locked: {
      type: DataTypes.CHAR,
      allowNull: true,
      defaultValue: "N"
    },
    Department: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: "((-2))"
    },
    UserPrefs: {
      type: "IMAGE",
      allowNull: true
    },
    Language: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Tel1: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Tel2: {
      type: DataTypes.STRING,
      allowNull: true
    },
    EnbMenuFlt: {
      type: DataTypes.CHAR,
      allowNull: true,
      defaultValue: "N"
    },
    objType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "12"
    },
    createDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    userSign2: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updateDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    OneLogPwd: {
      type: DataTypes.CHAR,
      allowNull: true,
      defaultValue: "Y"
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    LastPwds: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "0"
    },
    LastPwds2: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "0"
    },
    LastPwdSet: {
      type: DataTypes.DATE,
      allowNull: true
    },
    PwdNeverEx: {
      type: DataTypes.CHAR,
      allowNull: true,
      defaultValue: "N"
    },
    LstLogoutD: {
      type: DataTypes.DATE,
      allowNull: true
    },
    LstLoginT: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    LstLogoutT: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    LstPwdChT: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    LstPwdChB: {
      type: DataTypes.STRING,
      allowNull: true
    },
    RclFlag: {
      type: DataTypes.CHAR,
      allowNull: true,
      defaultValue: "N"
    }
  }, {
    tableName: 'OUSR'
  });
};
