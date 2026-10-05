// Bò sát bám theo con trỏ — port từ script.js gốc: bỏ biến toàn cục / DOM, để React lo canvas.
// Component gán env.ctx và env.mouse; setupLizard trả về con vật, gọi critter.follow(x, y) mỗi khung hình.
export const env = { ctx: null, mouse: { x: 0, y: 0 } };

class Segment {
  constructor(parent, size, angle, range, stiffness) {
    this.isSegment = true;
    this.parent = parent; //Segment which this one is connected to
    if (typeof parent.children == "object") {
      parent.children.push(this);
    }
    this.children = []; //Segments connected to this segment
    this.size = size; //Distance from parent
    this.relAngle = angle; //Angle relative to parent
    this.defAngle = angle; //Default angle relative to parent
    this.absAngle = parent.absAngle + angle; //Angle relative to x-axis
    this.range = range; //Difference between maximum and minimum angles
    this.stiffness = stiffness; //How closely it conforms to default angle
    this.updateRelative(false, true);
  }
  updateRelative(iter, flex) {
    this.relAngle =
      this.relAngle -
      2 *
        Math.PI *
        Math.floor((this.relAngle - this.defAngle) / 2 / Math.PI + 1 / 2);
    if (flex) {
      this.relAngle = Math.min(
        this.defAngle + this.range / 2,
        Math.max(
          this.defAngle - this.range / 2,
          (this.relAngle - this.defAngle) / this.stiffness + this.defAngle
        )
      );
    }
    this.absAngle = this.parent.absAngle + this.relAngle;
    this.x = this.parent.x + Math.cos(this.absAngle) * this.size; //Position
    this.y = this.parent.y + Math.sin(this.absAngle) * this.size; //Position
    if (iter) {
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].updateRelative(iter, flex);
      }
    }
  }
  // chỉ thêm đoạn thẳng vào path hiện tại; Creature.draw gọi stroke() 1 lần cho cả con
  draw(iter) {
    env.ctx.moveTo(this.parent.x, this.parent.y);
    env.ctx.lineTo(this.x, this.y);
    if (iter) {
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].draw(true);
      }
    }
  }
  follow(iter) {
    let x = this.parent.x;
    let y = this.parent.y;
    let dist = Math.max(((this.x - x) ** 2 + (this.y - y) ** 2) ** 0.5, 1e-9); // tránh chia 0 -> NaN làm hỏng cả con
    this.x = x + this.size * (this.x - x) / dist;
    this.y = y + this.size * (this.y - y) / dist;
    this.absAngle = Math.atan2(this.y - y, this.x - x);
    this.relAngle = this.absAngle - this.parent.absAngle;
    this.updateRelative(false, true);
    if (iter) {
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].follow(true);
      }
    }
  }
}
class LimbSystem {
  constructor(end, length, speed, creature) {
    this.end = end;
    this.length = Math.max(1, length);
    this.creature = creature;
    this.speed = speed;
    creature.systems.push(this);
    this.nodes = [];
    let node = end;
    for (let i = 0; i < length; i++) {
      this.nodes.unshift(node);
      node = node.parent;
      if (!node.isSegment) {
        this.length = i + 1;
        break;
      }
    }
    this.hip = this.nodes[0].parent;
  }
  moveTo(x, y) {
    this.nodes[0].updateRelative(true, true);
    let dist = ((x - this.end.x) ** 2 + (y - this.end.y) ** 2) ** 0.5;
    let len = Math.max(0, dist - this.speed);
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      let node = this.nodes[i];
      let ang = Math.atan2(node.y - y, node.x - x);
      node.x = x + len * Math.cos(ang);
      node.y = y + len * Math.sin(ang);
      x = node.x;
      y = node.y;
      len = node.size;
    }
    for (let i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      node.absAngle = Math.atan2(
        node.y - node.parent.y,
        node.x - node.parent.x
      );
      node.relAngle = node.absAngle - node.parent.absAngle;
      for (let ii = 0; ii < node.children.length; ii++) {
        let childNode = node.children[ii];
        if (!this.nodes.includes(childNode)) {
          childNode.updateRelative(true, false);
        }
      }
    }
  }
  update() {
    this.moveTo(env.mouse.x, env.mouse.y);
  }
}
class LegSystem extends LimbSystem {
  constructor(end, length, speed, creature) {
    super(end, length, speed, creature);
    this.goalX = end.x;
    this.goalY = end.y;
    this.step = 0; //0 stand still, 1 move forward,2 move towards foothold
    this.forwardness = 0;

    //For foot goal placement
    this.reach =
      0.9 *
      ((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) ** 0.5;
    let relAngle =
      this.creature.absAngle -
      Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
    relAngle -= 2 * Math.PI * Math.floor(relAngle / 2 / Math.PI + 1 / 2);
    this.swing = -relAngle + (2 * (relAngle < 0) - 1) * Math.PI / 2;
    this.swingOffset = this.creature.absAngle - this.hip.absAngle;
  }
  update() {
    this.moveTo(this.goalX, this.goalY);
    if (this.step == 0) {
      let dist =
        ((this.end.x - this.goalX) ** 2 + (this.end.y - this.goalY) ** 2) **
        0.5;
      if (dist > 1) {
        this.step = 1;
        this.goalX =
          this.hip.x +
          this.reach *
            Math.cos(this.swing + this.hip.absAngle + this.swingOffset) +
          (2 * Math.random() - 1) * this.reach / 2;
        this.goalY =
          this.hip.y +
          this.reach *
            Math.sin(this.swing + this.hip.absAngle + this.swingOffset) +
          (2 * Math.random() - 1) * this.reach / 2;
      }
    } else if (this.step == 1) {
      let theta =
        Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) -
        this.hip.absAngle;
      let dist =
        ((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) **
        0.5;
      let forwardness2 = dist * Math.cos(theta);
      let dF = this.forwardness - forwardness2;
      this.forwardness = forwardness2;
      if (dF * dF < 1) {
        this.step = 0;
        this.goalX = this.hip.x + (this.end.x - this.hip.x);
        this.goalY = this.hip.y + (this.end.y - this.hip.y);
      }
    }
  }
}
class Creature {
  constructor(
    x,
    y,
    angle,
    fAccel,
    fFric,
    fRes,
    fThresh,
    rAccel,
    rFric,
    rRes,
    rThresh
  ) {
    this.x = x; //Starting position
    this.y = y;
    this.absAngle = angle; //Staring angle
    this.fSpeed = 0; //Forward speed
    this.fAccel = fAccel; //Force when moving forward
    this.fFric = fFric; //Friction against forward motion
    this.fRes = fRes; //Resistance to motion
    this.fThresh = fThresh; //minimum distance to target to keep moving forward
    this.rSpeed = 0; //Rotational speed
    this.rAccel = rAccel; //Force when rotating
    this.rFric = rFric; //Friction against rotation
    this.rRes = rRes; //Resistance to rotation
    this.rThresh = rThresh; //Maximum angle difference before rotation
    this.children = [];
    this.systems = [];
  }
  follow(x, y) {
    let dist = ((this.x - x) ** 2 + (this.y - y) ** 2) ** 0.5;
    let angle = Math.atan2(y - this.y, x - this.x);
    //Update forward
    let accel = this.fAccel;
    if (this.systems.length > 0) {
      let sum = 0;
      for (let i = 0; i < this.systems.length; i++) {
        sum += this.systems[i].step == 0;
      }
      accel *= sum / this.systems.length;
    }
    this.fSpeed += accel * (dist > this.fThresh);
    this.fSpeed *= 1 - this.fRes;
    this.speed = Math.max(0, this.fSpeed - this.fFric);
    //Update rotation
    let dif = this.absAngle - angle;
    dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 1 / 2);
    if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
      this.rSpeed -= this.rAccel * (2 * (dif > 0) - 1);
    }
    this.rSpeed *= 1 - this.rRes;
    if (Math.abs(this.rSpeed) > this.rFric) {
      this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0) - 1);
    } else {
      this.rSpeed = 0;
    }

    //Update position
    this.absAngle += this.rSpeed;
    this.absAngle -=
      2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 1 / 2);
    this.x += this.speed * Math.cos(this.absAngle);
    this.y += this.speed * Math.sin(this.absAngle);
    this.absAngle += Math.PI;
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].follow(true, true);
    }
    for (let i = 0; i < this.systems.length; i++) {
      this.systems[i].update();
    }
    this.absAngle -= Math.PI;
    this.draw(true);
  }
  draw(iter) {
    let r = 4;
    env.ctx.beginPath();
    env.ctx.arc(
      this.x,
      this.y,
      r,
      Math.PI / 4 + this.absAngle,
      7 * Math.PI / 4 + this.absAngle
    );
    env.ctx.moveTo(
      this.x + r * Math.cos(7 * Math.PI / 4 + this.absAngle),
      this.y + r * Math.sin(7 * Math.PI / 4 + this.absAngle)
    );
    env.ctx.lineTo(
      this.x + r * Math.cos(this.absAngle) * 2 ** 0.5,
      this.y + r * Math.sin(this.absAngle) * 2 ** 0.5
    );
    env.ctx.lineTo(
      this.x + r * Math.cos(Math.PI / 4 + this.absAngle),
      this.y + r * Math.sin(Math.PI / 4 + this.absAngle)
    );
    if (iter) {
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].draw(true);
      }
    }
    env.ctx.stroke(); // 1 lần stroke cho cả đầu + toàn bộ thân/chân/đuôi
  }
}

// một đốt sống kèm hai "xương sườn" mảnh hai bên; cổ và đuôi dùng chung, chỉ khác độ dài đoạn cuối xương sườn (`tipLen`)
function addRibbedSegment(spinal, s, tipLen) {
  const seg = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
  for (let ii = -1; ii <= 1; ii += 2) {
    let node = new Segment(seg, s * 3, ii, 0.1, 2);
    for (let iii = 0; iii < 3; iii++) {
      node = new Segment(node, tipLen, -ii * 0.1, 0.1, 2);
    }
  }
  return seg;
}

export function setupLizard(size, legs, tail, w, h) {
  let s = size;
  //(x,y,angle,fAccel,fFric,fRes,fThresh,rAccel,rFric,rRes,rThresh)
  let critter = new Creature(
    w / 2,
    h / 2,
    0,
    s * 10,
    s * 2,
    0.5,
    16,
    0.5,
    0.085,
    0.5,
    0.3
  );
  let spinal = critter;
  //(parent,size,angle,range,stiffness)
  //Neck
  for (let i = 0; i < 6; i++) {
    spinal = addRibbedSegment(spinal, s, s * 0.1);
  }
  //Torso and legs
  for (let i = 0; i < legs; i++) {
    if (i > 0) {
      //Vertebrae and ribs
      for (let ii = 0; ii < 6; ii++) {
        spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5);
        for (let iii = -1; iii <= 1; iii += 2) {
          let node = new Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5);
          for (let iv = 0; iv < 3; iv++) {
            node = new Segment(node, s * 3, -iii * 0.3, 0.1, 2);
          }
        }
      }
    }
    //Legs and shoulders
    for (let ii = -1; ii <= 1; ii += 2) {
      let node = new Segment(spinal, s * 12, ii * 0.785, 0, 8); //Hip
      node = new Segment(node, s * 16, -ii * 0.785, 6.28, 1); //Humerus
      node = new Segment(node, s * 16, ii * 1.571, 3.1415, 2); //Forearm
      for (
        let iii = 0;
        iii < 4;
        iii++ //fingers
      ) {
        new Segment(node, s * 4, (iii / 3 - 0.5) * 1.571, 0.1, 4);
      }
      new LegSystem(node, 3, s * 12, critter);
    }
  }
  //Tail
  for (let i = 0; i < tail; i++) {
    spinal = addRibbedSegment(spinal, s, (s * 3 * (tail - i)) / tail);
  }
  return critter;
}
