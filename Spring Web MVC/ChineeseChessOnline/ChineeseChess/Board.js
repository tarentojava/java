function ChessGame(boardId) {
    // 大小及位置参数
    var layout = {
    padding: 30,
    cell: 50,
    chessRadius: 20,
    fontSize: 36,
    width: 400,
    height: 450,
    offsetWidth: 460,
    offsetHeight: 510
    };
    // 颜色及字体样式
    var style = {
    board: {
    border: "#630",
    background: "#fed",
    font: "36px 隶书"
    },
    chess: [{
    border: "#fa8",
    background: "#fc9",
    font: "36px 隶书",
    fontColor: "#c00"
    }, {
    border: "#fa8",
    background: "#fc9",
    font: "36px 隶书",
    fontColor: "#090"
    }]
    };
    // 棋盘组件
    var Board = RootWidget.extend({
    campOrder: 1, //上黑下红
    mover: 0,
    isMoving:false,
    boardMap:null,
    searchEngine:null,
    history:null,
    // 初始化
    // -设置位置，调用父类进行事件绑定，父类调用其父类实现绘图
    init: function () {
    this.offsetRect.left = 0;
    this.offsetRect.top = 0;
    this.offsetRect.right = 460;
    this.offsetRect.bottom = 510;
    this._super();
    this.history=new Array();
    this.boardMap=new Array();
    for(var i=0;i<9;i++){
    this.boardMap[i]=new Array();
    for(var j=0;j<10;j++)
    this.boardMap[i][j]=null;
    }
    for (var i = 0; i < this.children.length; i++) {
    var child = this.children[i];
    if (child instanceof Chess && child.pos != null){
    this.boardMap[child.pos.x][child.pos.y]=child;
    }
    }
    // this.searchEngine=new AlphaBetaEngine();
    this.searchEngine=new NegaScout_TT_HH();
    this.searchEngine.setMoveGenerator(new MoveGenerator());
    this.searchEngine.setEvaluator(new Evaluation());
    this.searchEngine.setSearchDepth(10);
    },
    // 在棋盘上寻找棋子
    findChess: function (pos) {
    if (!this.isValidPos(pos)) return null;
    for (var i = 0; i < this.children.length; i++) {
    var child = this.children[i];
    if (child instanceof Chess && child.pos != null && child.pos.equals(pos)) return child;
    }
    return null;
    },
    isGameOver: function(){
    var red=false,
    black=false;
    for (var i = 0; i < this.children.length; i++) {
    var child = this.children[i];
    if (child instanceof Chess){
    if(child.type=="R_KING") red=true;
    else if(child.type=="B_KING") black=true;
    if(red && black) return false;
    }
    }
    return true;
    },
    recordMove:function(chess, pos){
    var move=new Object();
    move.from=chess.pos;
    move.to=pos;
    move.target=this.findChess(pos);
    this.history.push(move);
    },
    restore:function(){
    if(this.history.length%2==1 ||this.history.length==0)return;
    for(var i=0;i<2;++i){
    var move=this.history.pop();
    chess=this.findChess(move.to);
    //反向移动当前棋盘上的棋子
    chess.autoMoveBackTo(move.from);
    //如果有已被吃掉的棋子
    if(move.target!=null){
    //添加已经被吃掉的棋子
    this.addChild(move.target);
    this.boardMap[move.to.x][move.to.y]=move.target;
    //移动的动画，从自身到自身的移动
    move.target.autoMoveBackTo(move.to);
    }
    }
    this.mover=0;
    },
    //不保留记录移动棋子，用于悔棋时
    moveChessWithoutRecored:function(chess,pos){
    this.boardMap[pos.x][pos.y]=chess;//修改map
    if(!chess.pos.equals(pos)){//原地移动，不要清除掉
    this.boardMap[chess.pos.x][chess.pos.y]=null;//清除原位置的棋子
    chess.pos = pos;
    }
    },
    // 移动棋子，行棋方改变
    moveChess: function (chess, pos) {
    this.recordMove(chess,pos);
    this.removeChess(pos);
    this.boardMap[pos.x][pos.y]=chess;
    this.boardMap[chess.pos.x][chess.pos.y]=null;
    chess.pos = pos;
    this.mover=1-chess.camp;
    this.computerMoveChess();
    //若对局结束
    if(this.isGameOver()){
    if(this.mover==1) alert("恭喜，你赢啦！");
    else alert("输了哦，下次再努力吧～");
    this.mover=-1;
    return;
    }
    },
    computerMoveChess:function(){
    //若轮到计算机方行棋
    if(this.mover==1){
    var _this=this;
    var timer=setInterval(function(){
    if(_this.isMoving) return;
    clearInterval(timer);
    var bestMove=_this.searchEngine.searchAGoodMove(_this.boardMap);
    if(bestMove.score<=-19990) {
    alert("我输了~");
    return;
    }
    var Chess=_this.findChess(bestMove.from);
    Chess.autoMoveTo(bestMove.to);
    },100);
    }
    },
    // 移除棋子
    removeChess: function (pos) {
    this.boardMap[pos.x][pos.y]=null;
    var chess = this.findChess(pos);
    if (chess != null) this.removeChild(chess);
    },
    // 无效位置，已有棋子或越界
    isValidPos: function (pos) {
    return pos != null && !this.isOutsideBoard(pos);
    },
    // 在河界内
    isInsideCamp: function (pos, camp) {
    if (!this.isValidPos(pos)) return false;
    if (camp == this.campOrder) {
    return pos.y <= 4;
    } else {
    return pos.y >= 5;
    }
    },
    // 在九宫内
    isInsidePalace: function (pos, camp) {
    if (!this.isValidPos(pos)) return false;
    if (pos.x < 3 || pos.x > 5) return false;
    if (camp == this.campOrder) {
    return pos.y <= 2;
    } else {
    return pos.y >= 7;
    }
    },
    //出界
    isOutsideBoard:function(pos){
    return pos.x<0 || pos.x>=9 || pos.y<0 || pos.y>=10;
    },
    // 棋盘绘制
    onPaint: function () {
    str="<table cellspacing=0 border=1>";
    for(var j=0;j<10;j++){
    str+="<tr>";
    for(var i=0;i<9;i++){
    str+="<td style='height:15px;width:40px;'>";
    if(this.boardMap[i][j]!=null)
    str+=this.boardMap[i][j].id;
    str+="</td>";
    }
    str+="</tr>";
    }
    str+="</table>";
    document.getElementById("debug").innerHTML=str;

    var ctx = this.canvas.getContext('2d');
    // 棋盘矩形背景
    ctx.fillStyle = style.board.background;
    ctx.beginPath();
    ctx.rect(0, 0, layout.offsetWidth, layout.offsetHeight);
    ctx.fill();
    ctx.closePath();
    // 线
    var p = layout.padding,
    s = layout.cell,
    w = layout.width,
    h = layout.height;
    ctx.strokeStyle = style.board.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // 10条横线
    for (var i = 0; i < 10; i++) {
    ctx.moveTo(p, s * i + p);
    ctx.lineTo(w + p, s * i + p);
    }
    // 左右边线
    ctx.moveTo(p, p);
    ctx.lineTo(p, h + p);
    ctx.moveTo(w + p, p);
    ctx.lineTo(w + p, h + p);
    // 7条断开的竖线
    for (var i = 1; i < 8; i++) {
    ctx.moveTo(s * i + p, p);
    ctx.lineTo(s * i + p, s * 4 + p);
    ctx.moveTo(s * i + p, s * 5 + p);
    ctx.lineTo(s * i + p, h + p);
    }
    // 斜线
    ctx.moveTo(s * 3 + p, p);
    ctx.lineTo(s * 5 + p, s * 2 + p);
    ctx.moveTo(s * 5 + p, 0 + p);
    ctx.lineTo(s * 3 + p, s * 2 + p);
    ctx.moveTo(s * 3 + p, s * 7 + p);
    ctx.lineTo(s * 5 + p, s * 9 + p);
    ctx.moveTo(s * 5 + p, s * 7 + p);
    ctx.lineTo(s * 3 + p, s * 9 + p);
    ctx.stroke();
    ctx.closePath();
    // 文字
    ctx.save();
    ctx.rotate(-Math.PI/2);
    ctx.font = style.board.font;
    ctx.fillStyle = style.board.border;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("楚", -(p+s*4.5), (p + s * 1.5));
    ctx.fillText("河", -(p+s*4.5), (p + s * 2.5));
    ctx.rotate(Math.PI);
    ctx.fillText("漢", (p+s*4.5), -(p+s*6.5));
    ctx.fillText("界", (p+s*4.5), -(p+s*5.5));
    ctx.restore();
    }
    });
    // 棋子组件
    var Chess = Widget.extend({
    name: null,
    type: null,
    camp: null,//0--红，1--黑
    pos: null,
    isDragging: false,
    targetPos: null,
    targetIndicatorAlpha: 0.2,
    create: function (id, parent, name, type, camp, pos) {
    this._super(id, parent);
    this.name = name;
    this.type = type;
    this.camp = camp || 0;
    this.pos = pos || new Point(0, 0);
    this.offsetRect.left = layout.padding + layout.cell * this.pos.x - layout.cell / 2;
    this.offsetRect.top = layout.padding + layout.cell * this.pos.y - layout.cell / 2;
    this.offsetRect.right = this.offsetRect.left + layout.cell;
    this.offsetRect.bottom = this.offsetRect.top + layout.cell;
    },
    // 绘制棋子
    onPaint: function () {
    var ctx = this.canvas.getContext('2d');
    ctx.fillStyle = style.chess[this.camp].background;
    ctx.strokeStyle = style.chess[this.camp].border;
    ctx.font = style.chess[this.camp].font;
    // 圆心
    var x = this.offsetRect.left + layout.cell / 2,
    y = this.offsetRect.top + layout.cell / 2;
    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    // 阴影
    if (this.isDragging) ctx.arc(x + 2, y + 4, layout.chessRadius + 1, 0, 360);
    else ctx.arc(x + 1, y + 2, layout.chessRadius + 1, 0, 360);
    ctx.fill();
    ctx.fillStyle = style.chess[this.camp].background;
    ctx.closePath();
    // 半透明提示位置
    if (this.targetPos != null && this.targetIndicatorAlpha > 0) {
    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 128, 0, " + this.targetIndicatorAlpha + ")";
    ctx.arc(layout.padding + this.targetPos.x * layout.cell, layout.padding + this.targetPos.y * layout.cell, layout.cell / 2, 0, 360);
    ctx.fill();
    ctx.fillStyle = style.chess[this.camp].background;
    ctx.closePath();
    }
    // 棋子本体
    ctx.beginPath();
    ctx.arc(x, y, layout.chessRadius, 0, 360);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText(this.name, x + 1, y - layout.fontSize / 16 + 1);
    ctx.fillStyle = style.chess[this.camp].fontColor;
    ctx.fillText(this.name, x, y - layout.fontSize / 16);
    ctx.stroke();
    ctx.closePath();
    },
    // 鼠标单击时
    onMouseDown: function (point) {
    if(this.parent.isMoving)return;
    if (this.parent.mover == this.camp) {//确认是行棋方
    this.isDragging = true;//棋子拖拽中
    this.parent.moveChildToTop(this);//调整到最上面的图层
    this.parent.redraw();//重绘
    }
    },
    // 鼠标移动时
    onMouseMove: function (point) {
    if (this.isDragging) {//若正在拖拽棋子
    if( point.x <= 0 || point.x >= layout.offsetWidth || point.y <= 0 || point.y >= layout.offsetHeight){
    this.isDragging = false; //停止拖拽
    this.moveTo(this.pos);//撤消移动
    this.parent.redraw();
    return;
    }
    //根据圆心反算矩形区域的左上角坐标
    var x = point.x - layout.cell / 2,
    y = point.y - layout.cell / 2;
    //移动棋子
    this.offsetRect.moveTo(x, y);
    //根据画面坐标计算在棋盘上的坐标
    var pos = this.point2chessPos(x, y);
    //验证目标位置
    if (this.isTargetValid(pos)) this.targetPos = pos;
    else this.targetPos = null;
    //重绘
    this.parent.redraw();
    }
    },
    // 鼠标弹起
    onMouseUp: function (point) {
    if (this.isDragging) { //拖拽棋子中
    this.isDragging = false; //停止拖拽
    var pos = this.targetPos || this.pos;
    this.moveTo(pos);//移动棋子
    if (this.targetPos != null) {//通知棋盘更改棋子位置
    this.parent.moveChess(this, pos);
    }
    }
    },
    autoMoveBackTo:function(pos){
    this.targetPos=pos;//目标位置
    this.moveTo(pos);//移动棋子动画
    if (this.targetPos != null) {//通知棋盘更改棋子位置
    this.parent.moveChessWithoutRecored(this, pos);
    }
    },
    autoMoveTo:function(pos){
    this.targetPos=pos;
    this.moveTo(pos);//移动棋子
    if (this.targetPos != null) {//通知棋盘更改棋子位置
    this.parent.moveChess(this, pos);
    }
    },
    //画布坐标转棋盘坐标
    point2chessPos: function (x, y) {
    return new Point(Math.ceil((x - layout.padding) / layout.cell), Math.ceil((y - layout.padding) / layout.cell));
    },
    chessPos2point: function (x, y) {},
    //移动棋子的动画
    moveTo: function (pos) {
    this.parent.isMoving=true;
    //目标位置，左上角
    var left = layout.padding + layout.cell * pos.x - layout.cell / 2,
    top = layout.padding + layout.cell * pos.y - layout.cell / 2;
    //目标位置对当前位置的偏移
    var dx = left - this.offsetRect.left,
    dy = top - this.offsetRect.top;
    //动画
    //-40ms频率
    var t = 0,
    c = 15,
    _this = this;
    var timer = setInterval(function () {
    //结束
    if (++t > c) {
    clearInterval(timer);
    _this.pos = pos;
    _this.offsetRect.moveTo(left, top);
    _this.targetPos = null;
    _this.targetIndicatorAlpha = 0.2;
    _this.parent.isMoving=false;
    return;
    }
    var ratio = 0;
    if (t <= c / 2) {//前一半
    ratio = 2 * t / c;//随时间，速率增大
    ratio = 1 - 0.5 * ratio * ratio * ratio * ratio;//位移为时间的4次幂
    } else {
    ratio = 2 - 2 * t / c;
    ratio = 0.5 * ratio * ratio * ratio * ratio;
    }
    _this.offsetRect.moveTo(left - dx * ratio, top - dy * ratio);
    _this.targetIndicatorAlpha = 0.2 * ratio;
    _this.parent.redraw();
    }, 40);
    },
    isTargetValid: function (pos) {
    if (!this.parent.isValidPos(pos)) return false;
    var chess = this.parent.findChess(pos);
    return chess == null || chess.camp != this.camp;
    },
    isRed:function(){
    return this.camp==0;
    },
    isSameCamp:function(chess){
    return this.camp==chess.camp;
    }
    });
    // 车
    var Chariot = Chess.extend({
    create: function (id, parent, camp, pos) {
    this._super(id, parent, "車", camp==0?"R_CAR":"B_CAR", camp, pos);
    },
    isTargetValid: function (pos) {
    if (!this._super(pos)) return false;
    var dx = pos.x - this.pos.x,
    dy = pos.y - this.pos.y;
    if (dx != 0 && dy != 0) return false;
    var targetChess = this.parent.findChess(pos);
    var steps = Math.max(Math.abs(dx), Math.abs(dy));
    var blockPos = new Point(this.pos.x, this.pos.y);
    for (var i = 1; i < steps; i++) {
    blockPos.x += dx / steps;
    blockPos.y += dy / steps;
    if (this.parent.findChess(blockPos) != null) return false;
    }
    return true;
    }
    });
    // 马
    var Horse = Chess.extend({
    create: function (id, parent, camp, pos) {
    this._super(id, parent, "馬", camp==0?"R_HORSE":"B_HORSE", camp, pos);
    },
    isTargetValid: function (pos) {
    if (!this._super(pos)) return false;
    var dx = pos.x - this.pos.x,
    dy = pos.y - this.pos.y;
    if (dx == 0 || dy == 0 || Math.abs(dx) + Math.abs(dy) != 3) return false;
    var targetChess = this.parent.findChess(pos);
    var blockPos = new Point(this.pos.x, this.pos.y);
    if (Math.abs(dx) == 2) blockPos.x += dx / 2;
    else blockPos.y += dy / 2;
    return this.parent.findChess(blockPos) == null;
    }
    });
    // 象/相
    var Elephant = Chess.extend({
    create: function (id, parent, camp, pos) {
    this._super(id, parent, camp == 0 ? "相" : "象", camp==0?"R_ELEPHANT":"B_ELEPHANT", camp, pos);
    },
    isTargetValid: function (pos) {
    if (!this._super(pos)) return false;
    if (!this.parent.isInsideCamp(pos, this.camp)) return false;
    var dx = pos.x - this.pos.x,
    dy = pos.y - this.pos.y;
    if (Math.abs(dx) != 2 || Math.abs(dy) != 2) return false;
    var blockPos = new Point(this.pos.x + dx / 2, this.pos.y + dy / 2);
    return this.parent.findChess(blockPos) == null;
    }
    });
    // 士
    var Guard = Chess.extend({
    create: function (id, parent, camp, pos) {
    this._super(id, parent, camp == 0 ? "士" : "仕", camp==0?"R_BISHOP":"B_BISHOP", camp, pos);
    },
    isTargetValid: function (pos) {
    if (!this._super(pos)) return false;
    if (!this.parent.isInsidePalace(pos, this.camp)) return false;
    var dx = pos.x - this.pos.x,
    dy = pos.y - this.pos.y;
    if (Math.abs(dx) != 1 || Math.abs(dy) != 1) return false;
    return true;
    }
    });
    // 将/帅
    var General = Chess.extend({
    create: function (id, parent, camp, pos) {
    this._super(id, parent, camp == 0 ? "帥" : "將", camp==0?"R_KING":"B_KING", camp, pos);
    },
    isTargetValid: function (pos) {
    if (!this._super(pos)) return false;
    var x,y;
    var target=this.parent.boardMap[pos.x][pos.y];
    if(target!=null){
    //alert(target.type);
    if (this.type=="R_KING" && target.type=="B_KING"){
    if(this.pos.x!==pos.x) return false;
    for(x=this.pos.x,y=this.pos.y-1;y>0 && this.parent.boardMap[x][y]==null;--y);
    if(y>=0 && this.parent.boardMap[x][y].type=="B_KING") return true;
    } else if (this.type=="B_KING" && target.type=="R_KING") {
    if(this.pos.x!=pos.x) return false;
    for(x=this.pos.x,y=this.pos.y+1;y<10 && this.parent.boardMap[x][y]==null;++y);
    if(y<10 && this.parent.boardMap[x][y].type=="R_KING") return true;
    }
    }
    if (!this.parent.isInsidePalace(pos, this.camp)) return false;
    var dx = pos.x - this.pos.x,
    dy = pos.y - this.pos.y;
    if (Math.abs(dx) + Math.abs(dy) != 1) return false;
    return true;
    }
    });
    // 炮
    var Cannon = Chess.extend({
    create: function (id, parent, camp, pos) {
    this._super(id, parent, camp == 0 ? "炮" : "砲", camp==0?"R_CANON":"B_CANON", camp, pos);
    },
    isTargetValid: function (pos) {
    if (!this._super(pos)) return false;
    var dx = pos.x - this.pos.x,
    dy = pos.y - this.pos.y;
    if (dx != 0 && dy != 0) return false;
    var targetChess = this.parent.findChess(pos);
    var steps = Math.max(Math.abs(dx), Math.abs(dy));
    var blockPos = new Point(this.pos.x, this.pos.y);
    var blocks = 0;
    for (var i = 1; i < steps; i++) {
    blockPos.x += dx / steps;
    blockPos.y += dy / steps;
    if (this.parent.findChess(blockPos) != null) blocks++;
    }
    return (blocks == 0 && targetChess == null) || (blocks == 1 && targetChess != null);
    }
    });
    // 兵/卒
    var Pawn = Chess.extend({
    create: function (id, parent, camp, pos) {
    this._super(id, parent, camp == 0 ? "兵" : "卒", camp==0?"R_PAWN":"B_PAWN", camp, pos);
    },
    isTargetValid: function (pos) {
    if (!this._super(pos)) return false;
    var dx = pos.x - this.pos.x,
    dy = pos.y - this.pos.y;
    if (this.parent.isInsideCamp(pos, this.camp) && dx != 0) return false;
    if (this.camp == this.parent.campOrder && dy < 0) return false;
    else if (this.camp != this.parent.campOrder && dy > 0) return false;
    if (Math.abs(dx) + Math.abs(dy) != 1) return false;
    return true;
    }
    });
    // 走法产生器
    var MoveGenerator=Class.extend({
    moveList:null, //走法列表：交错数组，moveList[depth][i]表示第depth层的第i种走法，depth范围0..maxDepth
    moveCount:0, //走法数量，交错数组第二维度的长度
    create:function(){
    this.moveList=new Array();
    for(var i=0;i<15;++i)
    this.moveList[i]=new Array();
    this.moveCount=0;
    },
    createPossibleMove:function(map, depth, isRedTurn){
    this.moveCount = 0;
    this.moveList[depth].length=0;
    var chess;
    //遍历棋盘，逐个棋子产生走法
    for (var j = 0; j < 10; ++j)
    for (var i = 0; i < 9; ++i)
    if ((chess=map[i][j]) != null)
    {
    if ((!isRedTurn && chess.isRed()) ||(isRedTurn && !chess.isRed())) continue;
    var pos=new Point(i,j);
    if(chess.type=="R_KING" || chess.type=="B_KING") this.genKingMove(map, pos, depth);
    else if(chess.type=="R_BOSHIP" || chess.type=="B_BOSHIP") this.genBishopMove(map, pos, depth);
    else if(chess.type=="R_ELEPHANT" || chess.type=="B_ELEPHANT") this.genElephantMove(map, pos, depth);
    else if(chess.type=="R_HORSE" || chess.type=="B_HORSE") this.genHorseMove(map, pos, depth);
    else if(chess.type=="R_CAR" || chess.type=="B_CAR") this.genCarMove(map, pos, depth);
    else if(chess.type=="R_PAWN" || chess.type=="B_PAWN") this.genPawnMove(map, pos, depth);
    else if(chess.type=="R_CANON" || chess.type=="B_CANON") this.genCanonMove(map, pos, depth);
    }
    return this.moveCount;
    },
    genKingMove:function(map, pos, depth){
    //左上右下
    var dx=[-1,0,1,0],
    dy=[0,-1,0,1];
    var chess=map[pos.x][pos.y];
    //九宫内的走法
    for (var k=0;k<4;++k) {
    var x=pos.x+dx[k],y=pos.y+dy[k];//移动
    if (y<0 || y>=10 || x<0 || x>=9) continue;//出界
    if ((x<3 || x>5) || (chess.type=="R_KING" && y<7) || (chess.type=="B_KING" && y>2)) continue;//出九宫
    if(map[x][y]!=null && chess.camp==map[x][y].camp) continue;//己方有子
    this.addMove(pos, new Point(x,y), depth);
    }
    //红对杀黑
    if (chess.type=="R_KING") {
    for(x=pos.x,y=pos.y-1;y>=0 && map[x][y]==null;--y);//沿线向上找到第一个棋子，或者直到出界
    if(y>=0 && map[x][y].type=="B_KING") this.addMove(pos,new Point(x,y), depth);//未出界且第一个棋子为黑帅
    }
    //黑对杀红
    else if (chess.type=="B_KING") {
    for(x=pos.x,y=pos.y+1;y<10 && map[x][y]==null;++y);//沿线向下找到第一个棋子，或者直到出界
    if(y<10 && map[x][y].type=="R_KING") this.addMove(pos,new Point(x,y), depth);//未出界且第一个棋子为红将
    }
    },
    genBishopMove:function(map, pos, depth){
    //左上，右上，右下，左下
    var dx=[-1,1,1,-1],
    dy=[-1,-1,1,1];
    var chess=map[pos.x][pos.y];
    //九宫内的走法
    for (var k=0;k<4;++k){
    var x=pos.x+dx[k],y=pos.y+dy[k];//移动
    if (y<0 || y>=10 || x<0 || x>=9) continue;//出界
    if ((x<3 || x>5) || (chess.type=="R_BISHOP" && y<7) || (chess.type=="B_BISHOP" && y>2))continue;//出九宫
    if(map[x][y]!=null && chess.camp==map[x][y].camp)continue;//己方有子
    this.addMove(pos, new Point(x,y), depth);
    }
    },
    genElephantMove:function(map, pos, depth){
    //左上、右上，右下，左下
    var dx=[-2,2,2,-2],
    dy=[-2,-2,2,2];
    var chess=map[pos.x][pos.y];
    for (var k=0;k<4;++k) {
    var x=pos.x+dx[k],y=pos.y+dy[k];
    if (y<0 || y>=10 || x<0 || x>=9) continue;//出界
    if ((chess.type=="R_ELEPHANT" && y<5) || (chess.type=="B_ELEPHANT" && y>4)) continue;//过河
    if(map[Math.floor((pos.x+x)/2)][Math.floor((pos.y+y)/2)] != null) continue;//塞象眼
    if(map[x][y]!=null && chess.camp==map[x][y].camp) continue;//己方有子
    this.addMove(pos, new Point(x,y), depth);
    }
    },
    genHorseMove:function(map, pos, depth){
    //顺时针
    var dx=[1,2,2,1,-1,-2,-2,-1],
    dy=[-2,-1,1,2,2,1,-1,-2];
    var chess=map[pos.x][pos.y];
    for (var k=0;k<8;++k) {
    var x=pos.x+dx[k],y=pos.y+dy[k];
    if (y<0 || y>=10 || x<0 || x>=9) continue;//出界
    if(map[pos.x+parseInt(dx[k]/2)][pos.y+parseInt(dy[k]/2)] != null) continue;//绊马腿
    if(map[x][y]!=null && chess.camp==map[x][y].camp) continue;//己方有子
    this.addMove(pos, new Point(x,y), depth);
    }
    },
    genCarMove:function(map, pos, depth){
    var x,y;
    var chess = map[pos.x][pos.y];
    //右，当前棋子右边至边界或第一个棋子间的空位置全部可走。
    for(x=pos.x+1,y=pos.y;x<9 && null == map[x][y];++x)this.addMove(pos, new Point(x, y), depth);
    //如未出界，且第一个棋子不是己方的，则可以杀子。
    if(x<9 && chess.camp!=map[x][y].camp) this.addMove(pos, new Point(x, y), depth);
    //左
    for(x=pos.x-1,y=pos.y;x >= 0 && null == map[x][y];--x)this.addMove(pos, new Point(x, y), depth);
    if(x>=0 && chess.camp!=map[x][y].camp) this.addMove(pos, new Point(x, y), depth);
    //下
    for(x=pos.x,y=pos.y+1;y < 10 && null == map[x][y];++y) this.addMove(pos, new Point(x, y), depth);
    if(y<10 && chess.camp!=map[x][y].camp) this.addMove(pos, new Point(x, y), depth);
    //上
    for(x =pos.x,y =pos.y-1;y>=0 && null == map[x][y];--y) this.addMove(pos, new Point(x, y), depth);
    if(y>=0 && chess.camp!=map[x][y].camp) this.addMove(pos, new Point(x, y), depth);
    },
    genPawnMove:function(map, pos, depth){
    var x,y;
    var chess = map[pos.x][pos.y];
    if((chess.type=="R_PAWN" && pos.y < 5)||(chess.type=="B_PAWN" && pos.y>4)) {//已过河
    y=pos.y;
    x=pos.x+1;//右
    if(x < 9 && (map[x][y]==null || chess.camp!=map[x][y].camp)) this.addMove( pos, new Point(x, y), depth);
    x=pos.x-1;//左
    if(x >= 0 && (map[x][y]==null || chess.camp!=map[x][y].camp)) this.addMove( pos, new Point(x, y), depth);
    }
    x=pos.x;
    y=pos.y+(chess.isRed()?-1:1);
    if ((chess.type=="R_PAWN" && y<0) || (chess.type=="B_PAWN" && y>=10)) return;//出界
    if(map[x][y]!=null && chess.camp==map[x][y].camp) return;//己方有子
    this.addMove(pos, new Point(x, y), depth);
    },
    genCanonMove:function(map, pos, depth){
    var x, y;
    var chess = map[pos.x][pos.y];
    //右，当前棋子右边至边界或第一个棋子间的空位置全部可走。
    for(x=pos.x+1,y=pos.y; x<9 && null == map[x][y]; ++x) this.addMove(pos, new Point(x, y), depth);
    //若未出界，则越过第一个棋子，查找其后的第一个棋子
    for(++x; x<9 && null == map[x][y]; ++x);
    //若未出界，且第一个棋子不是己方的，则杀子
    if(x<9 && chess.camp!=map[x][y].camp) this.addMove(pos, new Point(x, y), depth);
    //左
    for(x=pos.x-1,y=pos.y; x>=0 && null == map[x][y]; --x) this.addMove(pos, new Point(x, y), depth);
    for(--x; x>=0 && null == map[x][y]; --x);
    if(x>=0 && chess.camp!=map[x][y].camp) this.addMove(pos, new Point(x, y), depth);
    //下
    for(x=pos.x,y=pos.y+1; y<10 && null == map[x][y]; ++y) this.addMove(pos, new Point(x, y), depth);
    for(++y; y<10 && null == map[x][y]; ++y);
    if(y<10 && chess.camp!=map[x][y].camp) this.addMove(pos, new Point(x, y), depth);
    //上
    for(x=pos.x,y=pos.y-1; y>=0 && null == map[x][y]; --y) this.addMove(pos, new Point(x, y), depth);
    for(--y; y>=0 && null == map[x][y]; --y);
    if(y>=0 && chess.camp!=map[x][y].camp) this.addMove(pos, new Point(x, y), depth);
    },
    addMove:function(from, to, depth){
    this.moveList[depth][this.moveCount] = new Object();
    this.moveList[depth][this.moveCount].from = from;
    this.moveList[depth][this.moveCount].to = to;
    this.moveList[depth][this.moveCount].score=0;
    this.moveCount++;
    return this.moveCount;
    }
    });
    // 搜索引擎基类
    var SearchEngine=Class.extend({
    currentMap:null,
    searchDepth:3,
    evaluator:null,
    moveGen:null,
    bestMove:null,
    create:function(){
    this.currentMap=new Array();
    for(var i=0;i<9;++i){
    this.currentMap[i]=new Array();
    for(var j=0;j<10;++j)
    this.currentMap[i][j]=null;
    }
    },
    searchAGoodMove:function(){},
    setSearchDepth:function(depth){
    this.searchDepth = depth;
    },
    setEvaluator:function(evaluator){
    this.evaluator = evaluator;
    },
    setMoveGenerator:function(MG){
    this.moveGen = MG;
    },
    makeMove:function(move){
    var chess = this.currentMap[move.to.x][move.to.y];
    this.currentMap[move.to.x][move.to.y] = this.currentMap[move.from.x][move.from.y];
    this.currentMap[move.from.x][move.from.y] = null;
    return chess;
    },
    unMakeMove:function(move, chess){
    this.currentMap[move.from.x][move.from.y] = this.currentMap[move.to.x][move.to.y];
    this.currentMap[move.to.x][move.to.y] = chess;
    },
    mapCopy:function(map){
    for(var i=0;i<9;++i)
    for(var j=0;j<10;++j){
    var chess=map[i][j];
    if(chess!=null)
    this.currentMap[i][j]=new Chess(chess.id, null, chess.name, chess.type, chess.camp, new Point(chess.pos.x,chess.pos.y));
    else
    this.currentMap[i][j]=null;
    }
    },
    isGameOver:function(map, depth){
    var red = false, //红方存活壮况
    black = false; //黑方存活状况
    //遍历上方大本营
    for (var j = 7; j < 10; ++j)
    for (var i = 3; i < 6; ++i)
    if (map[i][j]!=null){
    if (map[i][j].type == "B_KING") black = true;
    if (map[i][j].type == "R_KING") red  = true;
    }
    //遍历下方大本营
    for (var j = 0; j < 3; ++j)
    for (var i = 3; i < 6; i++)
    if(map[i][j]!=null){
    if (map[i][j].type == "B_KING") black = true;
    if (map[i][j].type == "R_KING") red  = true;
    }

    //自上往下，depth递减，叶子为0。即，层数=maxDepth-depth。
    //-偶数层为己方，奇数层为对方走棋。
    //-本程序，黑方为己方
    var isBlackTurn = (this.maxDepth - depth + 1) % 2;
    // 自己回合的胜局，正无穷，否则，负无穷。
    return (red && black)?0:(black^isBlackTurn?-1:1)*(19990 + depth);
    }
    });
    // 历史记录表
    var HistoryHeuristic=Class.extend({
    historyTable:null,
    targetBuff:null,
    create:function(){
    this.historyTable=new Array();
    for(var f=0;f<90;++f){
    this.historyTable[f]=new Array();
    for(var t=0;t<90;++t)
    this.historyTable[f][t]=0;
    }
    this.targetBuff=new Array();
    },
    resetHistoryTable:function(){
    for(var f=0;f<90;++f)
    for(var t=0;t<90;++t)
    this.historyTable[f][t]=0;
    },
    getHistoryScore:function(move){
    var from = move.from.y*9+move.from.x,
    to = move.to.y*9+move.to.x;
    return this.historyTable[from][to];
    },
    enterHistoryScore:function(move,depth){
    var from = move.from.y*9+move.from.x,
    to = move.to.y*9+move.to.x;
    this.historyTable[from][to] += 2<<depth;
    },
    mergeSort:function(source, n, direction){
    var s = 1;
    while(s < n)
    {
    this.mergeAll(source, this.targetBuff, s, n, direction);
    s += s;
    this.mergeAll(this.targetBuff, source, s, n, direction);
    s += s;
    }
    },
    //合并大小为s的相邻二段子数组
    merge:function(source, target, l, m, r,direction){
    var i = l,
    j = m + 1,
    k = l;
    while((i <= m) && (j <= r))
    if (direction^(source[i].score >= source[j].score))
    target[k++] = source[i++];
    else
    target[k++] = source[j++];
    if(i > m)
    for (var q = j; q <= r; ++q)target[k++] = source[q];
    else
    for(var q = i; q <= m; ++q)target[k++] = source[q];
    },
    mergeAll:function(source, target, s, n, direction){
    var i = 0;
    while(i <= n - 2 * s){
    //合并大小为s的相邻二段子数组
    this.merge(source, target, i, i + s - 1, i + 2 * s - 1,direction);
    i=i+2*s;
    }
    if (i + s < n) //剩余的元素个数小於2s
    this.merge(source, target, i, i + s - 1, n - 1,direction);
    else
    for (var j = i; j <= n - 1; ++j) target[j] = source[j];
    }
    });
    // 置换表类
    //-采用Zobrist哈希
    //-hashCheck通常使用64bit的数字。此处因js不支持64bit整数运算，而改为一个长度为180字符串的完美哈希
    var TranspositionTable=Class.extend({
    hashKey32:null,
    hashKey32Table:null,
    hashCheck:null,
    TT:null,
    // 返回32bit的随机整数
    rand32:function(){
    return (Math.floor(Math.random()*(~(1<<31))))^((~(1<<31))&((Math.floor(Math.random()*(~(1<<31))))<<15))^((~(1<<31))&((Math.floor(Math.random()*(~(1<<31))))<<30));
    },
    // 初始化棋盘的哈希值
    initializeHashKey:function(){
    // 赋值：hashTable[棋子种类][x横坐标][y坐标]，32bit随机整数
    this.hashKey32Table=new Array();
    for (var i = 0; i < 15; ++i){
    this.hashKey32Table[i]=new Array();
    for (var j = 0; j < 9; ++j){
    this.hashKey32Table[i][j]=new Array();
    for (var k = 0; k < 10; ++k){
    this.hashKey32Table[i][j][k] = this.rand32();
    }
    }
    }
    // 置换表。TT[0]黑方，TT[1]红方。
    this.TT=new Array();
    this.TT[0] = new Array(1<<20);
    this.TT[1] = new Array(1<<20);
    for(var i=0;i<2;++i)
    for(var j=0;j<(1<<20);++j){
    this.TT[i][j]=new Object();
    this.TT[i][j].checkSum = 0;
    this.TT[i][j].entryType = "";
    this.TT[i][j].eval = 0;
    this.TT[i][j].depth = 0;
    }
    },
    // 构造函数
    create:function(){
    this.initializeHashKey();
    },
    // 棋子映射到一个整数，做下标
    //-可以将程序中棋子种类全部用整数表示，可以避免这一步骤，但会降低可读性。
    convertChessToNumber:function(chess){
    if(chess==null) return 0;
    var chessType=["","B_KING","B_CAR","B_HORSE","B_CANON","B_BISHOP","B_ELEPHANT","B_PAWN",
    "R_KING","R_CAR","R_HORSE","R_CANON","R_BISHOP","R_ELEPHANT","R_PAWN"];
    for(var i=0;i<chessType.length;++i)
    if(chess.type==chessType[i])
    return i;
    },
    // 计算当前棋局的哈希值
    calculateInitHashKey:function(map){
    this.hashKey32 = 0;
    this.hashCheck = "";//每个位置用一个两位数表示，
    for (j = 0; j < 9; ++j)
    for (k = 0; k < 10; ++k){
    var chessType=this.convertChessToNumber(map[j][k]);
    if (chessType != 0)
    this.hashKey32 = this.hashKey32 ^ this.hashKey32Table[chessType][j][k];
    this.hashCheck += String.fromCharCode(chessType+56);
    }
    },
    // 增量计算棋局map进行move操作后的哈希值。
    hashMakeMove:function(move,map){
    var fromId = this.convertChessToNumber(map[move.from.x][move.from.y]),
    toId= this.convertChessToNumber(map[move.to.x][move.to.y]);
    this.hashKey32 = this.hashKey32 ^ this.hashKey32Table[fromId][move.from.x][move.from.y];
    if (toId != 0) this.hashKey32 = this.hashKey32 ^ this.hashKey32Table[toId][move.to.x][move.to.y];
    this.hashCheck[(move.to.x*10+move.to.y)]=this.hashCheck[move.from.x*10+move.from.y];
    this.hashKey32 = this.hashKey32 ^ this.hashKey32Table[fromId][move.to.x][move.to.y];
    this.hashCheck[move.from.x*10+move.from.y]="0";
    },
    hashUnMakeMove:function(move,chess,map){
    var toId = this.convertChessToNumber(map[move.to.x][move.to.y]),
    chessId=this.convertChessToNumber(chess);
    this.hashKey32 = this.hashKey32 ^ this.hashKey32Table[toId][move.from.x][move.from.y];
    this.hashCheck[move.from.x*10+move.from.y]=this.hashCheck[move.to.x*10+move.to.y];
    this.hashKey32 = this.hashKey32 ^ this.hashKey32Table[toId][move.to.x][move.to.y];
    if (chessId) this.hashKey32 = this.hashKey32 ^ this.hashKey32Table[chessId][move.to.x][move.to.y];
    this.hashCheck[move.to.x*10+move.to.y]=String.fromCharCode(toId+56);
    },
    lookUpHashTable:function(alpha, beta, depth, isRedTurn){
    var x = this.hashKey32 & 0xFFFFF,
    pht = this.TT[isRedTurn][x];

    if (pht.depth >= depth && pht.checkSum == this.hashCheck){
    switch (pht.entryType) {
    case "exact":
    return pht.eval;
    case "lowerBound":
    if (pht.eval >= beta)
    return (pht.eval);
    else
    break;
    case "upperBound":
    if (pht.eval <= alpha)
    return (pht.eval);
    else
    break;
    }
    }
    return 66666;
    },
    enterHashTable:function(entryType, eval, depth,isRedTurn){
    var x = this.hashKey32 & 0xFFFFF;//二十位哈希地址
    this.TT[isRedTurn][x].checkSum = this.hashCheck;
    this.TT[isRedTurn][x].entryType = entryType;
    this.TT[isRedTurn][x].eval = eval;
    this.TT[isRedTurn][x].depth = depth;
    }
    });
    // alpha-beta剪枝算法引擎
    var AlphaBetaEngine=SearchEngine.extend({
    create:function(){
    this._super();
    },
    searchAGoodMove:function(map){
    this.mapCopy(map);
    this.maxDepth = this.searchDepth;
    this.alphabeta(this.maxDepth, -20000, 20000);
    return this.bestMove;
    },
    alphabeta:function(depth, alpha, beta){
    var score=this.isGameOver(this.currentMap, depth);
    if (score != 0) return score;
    if (depth <= 0)    //叶子节点取估值
    return this.evaluator.evaluate(this.currentMap, (this.maxDepth-depth)%2);//isRedTurn=(this.maxDepth-depth)%2

    var count = this.moveGen.createPossibleMove(this.currentMap, depth, (this.maxDepth-depth)%2);

    for (var i=0;i<count;i++)
    {
    var chess = this.makeMove(this.moveGen.moveList[depth][i]);
    score = -this.alphabeta(depth - 1, -beta, -alpha);
    this.unMakeMove(this.moveGen.moveList[depth][i],chess);

    if (score > alpha)
    {
    alpha = score;
    if(depth == this.maxDepth)
    this.bestMove = this.moveGen.moveList[depth][i];
    }
    if (alpha >= beta) break;
    }
    return alpha;
    }
    });
    // 极小窗口搜索+历史启发+置换表+迭代加深优化
    var NegaScout_TT_HH=SearchEngine.extend({
    TT:null,
    HH:null,
    timeCount:null,
    timeLimit:null,
    create:function(){
    this._super();
    this.TT=new TranspositionTable();
    this.HH=new HistoryHeuristic();
    },
    searchAGoodMove:function(map){
    // 最佳走步备份
    var backupBestMove=new Object();
    // 搜索停止时的深度
    var stopDepth=0;
    // 时间限制
    this.timeLimit=1500;
    // 棋盘值拷贝
    //-由于会中途停止，不能返回初始状态，因此需要值拷贝，避免影响棋局进行
    this.mapCopy(map);
    // 计算初始值
    this.TT.calculateInitHashKey(this.currentMap);
    this.HH.resetHistoryTable();
    this.timeCount=(new Date()).getTime();
    for (this.maxDepth = 1; this.maxDepth <= this.searchDepth; this.maxDepth++){
    if(this.negaScout(this.maxDepth, -20000, 20000)!=66666){
    backupBestMove.from=new Point(this.bestMove.from.x,this.bestMove.from.y);
    backupBestMove.to=new Point(this.bestMove.to.x,this.bestMove.to.y);
    backupBestMove.score=this.bestMove.score;
    stopDepth=this.maxDepth;
    }
    }
    document.getElementById("TimeCost").innerHTML=(new Date().getTime()-this.timeCount).toString();
    document.getElementById("depth").innerHTML=stopDepth-1;
    return backupBestMove;
    },
    negaScout:function(depth, alpha, beta){
    // 若胜负已分，则不需要再搜索
    var score = this.isGameOver(this.currentMap, depth);
    if (score != 0) return score;
    // 判断行棋方
    var isRedTurn = (this.maxDepth-depth)%2;
    // 检查哈希表，如果已有记录，则直接返回
    score = this.TT.lookUpHashTable(alpha, beta, depth, isRedTurn);
    if (score != 66666) return score;
    // 叶子节点，估值
    if (depth <= 0){
    score = this.evaluator.evaluate(this.currentMap, isRedTurn );
    this.TT.enterHashTable("exact", score, depth, isRedTurn );
    return score;
    }
    // 第一层节点层已超时，则停止继续搜索。如不是第一层节点，则应继续完成搜索。
    if (depth == this.maxDepth){
    if ((new Date().getTime()) - this.timeCount >= this.timeLimit)
    return 66666;
    }
    // 产生子节点
    var count = this.moveGen.createPossibleMove(this.currentMap, depth, isRedTurn);
    // 取出历史记录中的分数排序，调整子节点顺序
    for (i=0;i<count;i++)
    this.moveGen.moveList[depth][i].score = this.HH.getHistoryScore(this.moveGen.moveList[depth][i]);
    this.HH.mergeSort(this.moveGen.moveList[depth], count, 0);
    // 搜索
    var bestmove=-1;
    var a = alpha,
    b = beta;
    var isEvalExact = 0;
    // 遍历子节点
    for (var i = 0; i < count; ++i ) {
    // 计算哈希值
    this.TT.hashMakeMove(this.moveGen.moveList[depth][i], this.currentMap);
    // 移动棋子，转移到新状态
    var target = this.makeMove(this.moveGen.moveList[depth][i]);
    // 第一个节点是全窗口搜索
    var t = -this.negaScout(depth-1 , -b, -a );
    // 第一个节点后的，若fail hight，则重新搜索
    if (t > a && t < beta && i > 0)
    {
    a = -this.negaScout (depth-1, -beta, -t );
    isEvalExact = 1;
    if(depth == this.maxDepth)
    this.bestMove = this.moveGen.moveList[depth][i];
    bestmove = i;
    }

    // 撤消哈希
    this.TT.hashUnMakeMove(this.moveGen.moveList[depth][i], target, this.currentMap);
    // 恢复状态
    this.unMakeMove(this.moveGen.moveList[depth][i],target);
    // 命中，保存
    if (a < t)
    {
    isEvalExact = 1;
    a=t;
    if(depth == this.maxDepth)
    this.bestMove = this.moveGen.moveList[depth][i];
    }
    if ( a >= beta )
    {
    //下边界进入哈希表
    this.TT.enterHashTable("lowerBound", a, depth, isRedTurn);
    //历史记录
    this.HH.enterHistoryScore(this.moveGen.moveList[depth][i], depth);
    return a;// 剪枝
    }
    b = a + 1;// 设定新的空窗
    }
    // 最佳走法加入历史记录
    if (bestmove != -1)
    this.HH.enterHistoryScore(this.moveGen.moveList[depth][bestmove], depth);
    // 搜索结果存入置换表
    if (isEvalExact)
    this.TT.enterHashTable("exact", a, depth, isRedTurn);
    else
    this.TT.enterHashTable("upperBound", a, depth, isRedTurn);
    return a;
    }
    });
    // 估值引擎
    var Evaluation=Class.extend({
    constant:{
    baseValue:{
    R_PAWN:100,
    R_BISHOP:250,
    R_ELEPHANT:250,
    R_CAR:500,
    R_HORSE:350,
    R_CANON:350,
    R_KING:10000,

    B_PAWN:100,
    B_BISHOP:250,
    B_ELEPHANT:250,
    B_CAR:500,
    B_HORSE:350,
    B_CANON:350,
    B_KING:10000
    },
    flexValue:{
    R_PAWN:15,
    R_BISHOP:1,
    R_ELEPHANT:1,
    R_CAR:6,
    R_HORSE:12,
    R_CANON:6,
    R_KING:0,

    B_PAWN:15,
    B_BISHOP:1,
    B_ELEPHANT:1,
    B_CAR:6,
    B_HORSE:12,
    B_CANON:6,
    B_KING:0
    },
    BPawn:[
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [ 70, 70, 70, 70, 70, 70, 70, 70, 70],
    [ 70, 90,110,110,110,110,110, 90, 70],
    [ 90, 90,110,120,120,120,110, 90, 90],
    [ 90, 90,110,120,120,120,110, 90, 90],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0]
    ],
    RPawn:[
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [ 90, 90,110,120,120,120,110, 90, 90],
    [ 90, 90,110,120,120,120,110, 90, 90],
    [ 70, 90,110,110,110,110,110, 90, 70],
    [ 70, 70, 70, 70, 70, 70, 70, 70, 70],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0]
    ]
    },
    attackPos:null,
    guardPos:null,
    flexibilityPos:null,
    chessValue:null,
    posCount:0,
    relatePos:null,
    create:function(){
    this.relatePos=new Array();
    this.posCount=0;
    //初始化
    this.chessValue=new Array();
    this.attackPos=new Array();//威胁度
    this.guardPos=new Array();//受保护度
    this.flexibilityPos=new Array();//灵活度
    for(var i=0;i<9;++i){
    this.chessValue[i]=new Array();
    this.attackPos[i]=new Array();
    this.guardPos[i]=new Array();
    this.flexibilityPos[i]=new Array();
    for(var j=0;j<10;++j){
    this.chessValue[i][j]=0;
    this.attackPos[i][j]=0;
    this.guardPos[i][j]=0;
    this.flexibilityPos[i][j]=0;
    }
    }
    },
    evaluate:function(map, isRedTurn){
    for(var i=0;i<9;++i){
    for(var j=0;j<10;++j){
    this.chessValue[i][j]=0;
    this.attackPos[i][j]=0;
    this.guardPos[i][j]=0;
    this.flexibilityPos[i][j]=0;
    }
    }
    //第一遍扫描，计算保护、威胁、灵活度
    for(var j = 0; j < 10; ++j)
    for(var i = 0; i < 9; ++i)
    {
    if(map[i][j] != null)
    {
    var chess = map[i][j];
    this.getRelatePiece(map, new Point(i,j));//所有相关位置
    //alert(this.posCount);
    for (var k = 0; k < this.posCount; ++k)
    {
    var target = map[this.relatePos[k].x][this.relatePos[k].y];
    if (target == null)
    {
    ++this.flexibilityPos[i][j];
    }
    else
    {
    if (chess.camp==target.camp)//保护
    {
    ++this.guardPos[this.relatePos[k].x][this.relatePos[k].y];
    }
    else//威胁
    {
    ++this.flexibilityPos[i][j];
    //威胁度=3+棋子价值差的百分之一
    this.attackPos[this.relatePos[k].x][this.relatePos[k].y] += 3+Math.floor((this.constant.baseValue[target.type] - this.constant.baseValue[chess.type])*0.01);
    if(target.type=="R_KING")
    if (!isRedTurn) return 18888;//失败
    else if(target.type=="B_KING")
    if (isRedTurn) return 18888;//失败
    }
    }
    }
    }
    }
    //第二遍扫描，基本价值、灵活性、附加值、威胁、保护
    var BRKing=["B_KING","R_KING"];
    for(var j = 0; j < 10; ++j)
    for(var i = 0; i < 9; ++i)
    {
    if(map[i][j] != null)
    {
    var chess = map[i][j];
    var halfValue = Math.floor(this.constant.baseValue[chess.type]/16);//基本价值的16分之一作为基本单位
    this.chessValue[i][j] += this.constant.baseValue[chess.type];//基本价值
    this.chessValue[i][j] += this.constant.flexValue[chess.type] * this.flexibilityPos[i][j];//灵活性的价值
    if(chess.type=="R_PAWN")this.chessValue[i][j] += this.constant.RPawn[j][i];//兵的附加值
    if(chess.type=="B_PAWN")this.chessValue[i][j] += this.constant.BPawn[j][i];//卒的附加值

    if (this.attackPos[i][j])//被威胁，分数减少
    {
    if ((chess.isRed() && isRedTurn) || (!chess.isRed() && !isRedTurn))//被威胁且自己走
    {
    if (chess.type == BRKing[isRedTurn])
    {
    this.chessValue[i][j]-= 20;//自己的将被威胁，对方有利
    }
    else
    {
    this.chessValue[i][j] -= halfValue * 2;//低度威胁
    if (this.guardPos[i][j])this.chessValue[i][j] += halfValue;//被保护，威胁降低一半
    }
    }
    else//被威胁且对方走棋
    {
    if (chess.type == BRKing[isRedTurn])
    return 18888;//自己的将被威胁，对方走棋，失败
    this.chessValue[i][j] -= halfValue*10;//高度威胁
    if (this.guardPos[i][j])this.chessValue[i][j] += halfValue*9;//被保护，威胁大部分消除
    }
    //被威胁度越大，对方越有利，这里用于兑子计算
    this.chessValue[i][j] -= this.attackPos[i][j];
    }
    else
    {
    if (this.guardPos[i][j])this.chessValue[i][j] += 5;//不受威胁，只受保护，加一点分
    }
    }
    }
    //第三遍扫描、总价值
    var BRValue=[0,0];
    for(j = 0; j < 10; ++j)
    for(i = 0; i < 9; ++i)
    {
    var chess = map[i][j];
    if (chess != null)
    BRValue[chess.isRed()?1:0]+=this.chessValue[i][j];
    }
    //返回估值
    return BRValue[isRedTurn] - BRValue[isRedTurn^1];
    },
    getRelatePiece:function(map,pos){
    this.posCount = 0;
    this.relatePos.length=0;
    chess = map[pos.x][pos.y];
    if(chess.type=="R_KING"||chess.type=="B_KING")this.genKingMove(map,pos);
    else if(chess.type=="R_BISHOP"||chess.type=="B_BISHOP")this.genBishopMove(map,pos);
    else if(chess.type=="R_ELEPHANT"||chess.type=="B_ELEPHANT")this.genElephantMove(map,pos);
    else if(chess.type=="R_HORSE"||chess.type=="B_HORSE")this.genHorseMove(map,pos);
    else if(chess.type=="R_CAR"||chess.type=="B_CAR")this.genCarMove(map,pos);
    else if(chess.type=="R_PAWN"||chess.type=="B_PAWN")this.genPawnMove(map,pos);
    else if(chess.type=="R_CANON"||chess.type=="B_CANON")this.genCanonMove(map,pos);
    return this.posCount;
    },
    genKingMove:function(map, pos){
    var x,y,k;
    var dx=[-1,0,1,0],
    dy=[0,-1,0,1];
    var chess=map[pos.x][pos.y];
    for (k=0;k<4;++k)
    {
    x=pos.x+dx[k],y=pos.y+dy[k];
    if (y<0 || y>=10 || x<0 || x>=9) continue;
    if ((x<3 || x>5) || (chess.type=="R_KING" && y<7) || (chess.type=="B_KING" && y>2))continue;
    this.addPoint(new Point(x,y));
    }
    if (chess.type=="R_KING")
    {
    for(x=pos.x,y=pos.y-1;y>=0 && map[x][y]==null;--y);
    if(y>=0 && map[x][y]=="B_KING")this.addPoint(new Point(x,y));
    }
    else if (chess.type=="B_KING")
    {
    for(x=pos.x,y=pos.y+1;y<10 && map[x][y]==null;++y);
    if(y<10 && map[x][y]=="R_KING")this.addPoint(new Point(x,y));
    }
    },
    genBishopMove:function(map, pos){
    var x,y,k;
    var dx=[-1,1,1,-1],
    dy=[-1,-1,1,1];
    var chess=map[pos.x][pos.y];
    for (k=0;k<4;++k)
    {
    x=pos.x+dx[k],y=pos.y+dy[k];
    if (y<0 || y>=10 || x<0 || x>=9) continue;
    if ((x<3 || x>5) || (chess.type=="R_BISHOP" && y<7) || (chess.type=="B_BISHOP" && y>2))continue;
    this.addPoint(new Point(x,y));
    }
    },
    genElephantMove:function(map, pos, ply){
    var x,y,k;
    var dx=[-2,2,2,-2],
    dy=[-2,-2,2,2];
    var chess=map[pos.x][pos.y];
    for (k=0;k<4;++k)
    {
    x=pos.x+dx[k],y=pos.y+dy[k];
    if (y<0 || y>=10 || x<0 || x>=9) continue;
    if ((chess.type=="R_ELEPHANT" && y<5) || (chess.type=="B_ELEPHANT" && y>4))continue;
    if(map[Math.floor((pos.x+x)/2)][Math.floor((pos.y+y)/2)] != null)continue;
    this.addPoint(new Point(x,y));
    }
    },
    genHorseMove:function(map, pos){
    var x,y,k;
    var dx=[1,2,2,1,-1,-2,-2,-1],
    dy=[-2,-1,1,2,2,1,-1,-2];
    var chess=map[pos.x][pos.y];
    for (k=0;k<8;++k)
    {
    x=pos.x+dx[k],y=pos.y+dy[k];
    if (y<0 || y>=10 || x<0 || x>=9) continue;
    if(map[pos.x+parseInt(dx[k]/2)][pos.y+parseInt(dy[k]/2)] != null)continue;
    this.addPoint(new Point(x,y));
    }
    },
    genCarMove:function(map, pos){
    var x,y;
    var chess = map[pos.x][pos.y];
    for(x=pos.x+1,y=pos.y;x<9 && null == map[x][y];++x)this.addPoint(new Point(x, y));
    if(x<9) this.addPoint(new Point(x, y));
    for(x=pos.x-1,y=pos.y;x >= 0 && null == map[x][y];--x)this.addPoint(new Point(x, y));
    if(x>=0) this.addPoint(new Point(x, y));
    for(x=pos.x,y=pos.y+1;y < 10 && null == map[x][y];++y) this.addPoint(new Point(x, y));
    if(y<10) this.addPoint(new Point(x, y));
    for(x =pos.x,y =pos.y-1;y>=0 && null == map[x][y];--y) this.addPoint(new Point(x, y));
    if(y>=0) this.addPoint(new Point(x, y));
    },
    genPawnMove:function(map, pos){
    var x,y;
    var chess = map[pos.x][pos.y];
    if((chess.type=="R_PAWN" && pos.y < 5)||(chess.type=="B_PAWN" && pos.y>4))
    {
    y=pos.y,x=pos.x+1;
    if(x < 9) this.addPoint(new Point(x, y));
    x=pos.x-1;
    if(x >= 0) this.addPoint(new Point(x, y));
    }
    x=pos.x;
    y=pos.y+(chess.isRed()?-1:1);
    if ((chess.type=="R_PAWN" && y<0) || (chess.type=="B_PAWN" && y>=10))return;
    this.addPoint(new Point(x, y));
    },
    genCanonMove:function(map, pos){
    var x, y;
    var chess = map[pos.x][pos.y];
    for(x=pos.x+1,y=pos.y;x<9 && null == map[x][y];++x)this.addPoint(new Point(x, y));
    for(++x;x<9 && null == map[x][y];++x);
    if(x<9) this.addPoint(new Point(x, y));
    for(x=pos.x-1,y=pos.y;x>=0 && null == map[x][y];--x) this.addPoint(new Point(x, y));
    for(--x;x>=0 && null == map[x][y];--x);
    if(x>=0) this.addPoint(new Point(x, y));
    for(x=pos.x,y=pos.y+1;y<10 && null == map[x][y];++y) this.addPoint(new Point(x, y));
    for(++y;y<10 && null == map[x][y];++y);
    if(y<10) this.addPoint(new Point(x, y));
    for(x=pos.x,y=pos.y-1;y>=0 && null == map[x][y];--y)this.addPoint(new Point(x, y));
    for(--y;y>=0 && null == map[x][y];--y);
    if(y>=0)this.addPoint(new Point(x, y));
    },
    addPoint:function(pos){
    this.relatePos[this.posCount++] = pos;
    }
    });
    // 游戏控制类
    var GameManager = Class.extend({
    canvas:null,
    board:null,
    create:function(boardId){
    this.canvas = document.getElementById(boardId);
    },
    // 初始化
    init:function () {
    this.board = new Board("chessBoard", this.canvas);
    this.createChesses(this.board);
    this.board.init();
    this.board.show();
    },
    restore:function(){
    this.board.restore();
    },
    createChesses:function(board) {
    {
    (new Chariot("車01", board, 0, new Point(0, 9)));
    (new Chariot("車02", board, 0, new Point(8, 9)));
    (new Horse("馬01", board, 0, new Point(1, 9)));
    (new Horse("馬02", board, 0, new Point(7, 9)));
    (new Elephant("相01", board, 0, new Point(2, 9)));
    (new Elephant("相02", board, 0, new Point(6, 9)));
    (new Guard("士01", board, 0, new Point(3, 9)));
    (new Guard("士02", board, 0, new Point(5, 9)));
    (new General("帥00", board, 0, new Point(4, 9)));
    (new Pawn("兵01", board, 0, new Point(0, 6)));
    (new Pawn("兵02", board, 0, new Point(2, 6)));
    (new Pawn("兵03", board, 0, new Point(4, 6)));
    (new Pawn("兵04", board, 0, new Point(6, 6)));
    (new Pawn("兵05", board, 0, new Point(8, 6)));
    (new Cannon("炮01", board, 0, new Point(1, 7)));
    (new Cannon("炮02", board, 0, new Point(7, 7)));
    } {
    (new Chariot("車11", board, 1, new Point(0, 0)));
    (new Chariot("車12", board, 1, new Point(8, 0)));
    (new Horse("馬11", board, 1, new Point(1, 0)));
    (new Horse("馬12", board, 1, new Point(7, 0)));
    (new Elephant("象11", board, 1, new Point(2, 0)));
    (new Elephant("象12", board, 1, new Point(6, 0)));
    (new Guard("仕11", board, 1, new Point(3, 0)));
    (new Guard("仕12", board, 1, new Point(5, 0)));
    (new General("將10", board, 1, new Point(4, 0)));
    (new Pawn("卒11", board, 1, new Point(0, 3)));
    (new Pawn("卒12", board, 1, new Point(2, 3)));
    (new Pawn("卒13", board, 1, new Point(4, 3)));
    (new Pawn("卒14", board, 1, new Point(6, 3)));
    (new Pawn("卒15", board, 1, new Point(8, 3)));
    (new Cannon("砲11", board, 1, new Point(1, 2)));
    (new Cannon("砲12", board, 1, new Point(7, 2)));
    }
    }
    });
    return new GameManager(boardId);
    }
/**
 * Created by F.U.C.K on 18-Oct-14.
 */
