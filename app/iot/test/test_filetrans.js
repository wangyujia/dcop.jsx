/// js/app/iot/test/test_filetrans.js
/**
 * ²âÊÔÎÄ¼þ´«Êä
 */

var filetrans_index;

/*
dump-iot.edge:test,upload
*/
IOT_TEST_CASE('upload', function() {
    printlog('filetrans type: ' + typeof(filetrans));
    print_obj_member(filetrans, printlog, 'filetrans');

    if (!filetrans_index) {
        var index = filetrans.create(function(index, node, server, remote, local) {
            var s;
            if (node.op == "download") s = "'" + server + "'|'" + remote + "' -> '" + local + "'";
            else if (node.op == "upload") s = "'" + local + "' -> '" + server + "'|'" + remote + "'";
            else s = "'" + server + "'|'" + remote + "'|'" + local + "'";
            printlog("index: " + index, s, node.state, node.progress + "|" + node.offset + "|" + 
                node.fileLen + "|" + node.sendLen + "|" + node.sendIdx + "|" + node.mtu  + "|" + 
                node.err + "(" + node.rc + ")");
        });
        printlog('filetrans create rc: ' + index);
        filetrans_index = index;
    }

    var r = filetrans.upload(filetrans_index, "tcp.server", "c:/risa/video/haik8.mp4", "httpd/haik/haik2.mp4");
    printlog('filetrans upload rc: ' + r);
});


/*
dump-iot.edge:test,process_async
*/
IOT_TEST_CASE('process_async', function() {
    printlog('dcop type: ' + typeof(dcop));
    print_obj_member(dcop, printlog, 'dcop');

    var path, file, args;
    if (dcop.os == "windows") {
        path = "./";
        file = "video_format.bat";
        args = "video_format.bat video.mp4 video_format.mp4";
    } else {
        path = "/bin/sh";
        file = "sh";
        args = "child.sh";
    }
    var r = dcop.process_async(path, file, args, function(r) {
        printlog('process_async notify rc: ' + r);
    }, 0xffffffff, 1);
    printlog('process_async create rc: ' + r);
});
