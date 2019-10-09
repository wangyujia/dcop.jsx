/// js/app/db/ado_proxy.js
/**
 * 数据库侧ADO代理
 */



/**
 * 创建ADO代理动态库对象
 * @returns {Object} 动态库对象
 *  return: {
 *      login:   {Function} 登录 function(str) { ... true; }
 *      query:   {Function} 查询 (指定事务) function(sql, transaction) { ... true; }
 *      query:   {Function} 查询 (不带事务) function(sql) { ... true; }
 *      command: {Function} 设置 function(sql) { ... true; }
 *  }
 */
function adoproxy() {
    var m_dll = dlls.create();
    var m_rc = m_dll.load('AdoProxy.dll');

    var o = {};

    /// 登录接口
    add_obj_method(o, 'login', function(str) {
        if (!m_dll) return false;

        var rc = m_dll.login(str);
        return (rc == 0)? true : false;
    });

    /// 查询接口
    add_obj_method(o, 'query', function(sql, transaction) {
        if (!m_dll) return false;

        var out = m_dll.query(sql, transaction);
        if (out.rc == 0) {
            this.data = out.data;
            return true;
        }

        this.err = out.err;
        return false;
    });

    add_obj_method(o, 'query', function(sql) {
        if (!m_dll) return false;

        var out = m_dll.query(sql);
        if (out.rc == 0) {
            this.data = out.data;
            return true;
        }

        this.err = out.err;
        return false;
    });

    add_obj_method(o, 'command', function(sql) {
        if (!m_dll) return false;

        var out = m_dll.command(sql);
        if (out.rc == 0) {
            return true;
        }

        this.err = out.err;
        return false;
    });

    return o;
}

