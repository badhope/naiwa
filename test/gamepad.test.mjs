import test from 'node:test';
import assert from 'node:assert/strict';
import {PAD_DEADZONE,pickGamepad,readGamepad} from '../dist/gamepad.js';

const pad=(axes,down=[])=>({
 connected:true,
 axes,
 buttons:Array.from({length:16},(_,i)=>({pressed:down.includes(i)}))
});

test('left and right sticks move and aim once they pass the deadzone',()=>{
 const idle=readGamepad(pad([0,0,0,0]));
 assert.deepEqual(idle,{mx:0,my:0,ax:0,ay:0,fire:false,dash:false,bomb:false,use:false,active:false,pause:false});
 const move=readGamepad(pad([1,0,0,0]));
 assert.equal(move.mx,1);assert.equal(move.my,0);assert.equal(move.fire,false,'move stick never fires');
 const aim=readGamepad(pad([0,0,0,-1]));
 assert.equal(aim.ay,-1);assert.equal(aim.ax,0);assert.equal(aim.fire,true);
 assert.equal(readGamepad(pad([PAD_DEADZONE-.01,0,0,0])).mx,0,'inside the deadzone is a rest');
});

test('face buttons mirror the keyboard actions and the D-pad overrides a drifting stick',()=>{
 const all=readGamepad(pad([0,0,0,0],[0,1,2,3,9]));
 assert.deepEqual([all.dash,all.bomb,all.use,all.active,all.pause],[true,true,true,true,true]);
 const dpad=readGamepad(pad([0,0,.6,.6],[14]));
 assert.deepEqual([dpad.ax,dpad.ay,dpad.fire],[0,1,true],'D-pad down beats the right stick');
 assert.equal(readGamepad({connected:false,axes:[]}),null);
 assert.equal(pickGamepad([{connected:false},{connected:true,axes:[]}]).connected,true);
 assert.equal(pickGamepad([]),null);
 assert.equal(pickGamepad(undefined),null);
});
