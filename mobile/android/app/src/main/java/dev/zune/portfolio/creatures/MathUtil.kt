package dev.zune.portfolio.creatures

import kotlin.math.PI
import kotlin.math.floor
import kotlin.random.Random

// Port of src/lib/math.js: the small math / random helpers shared by the animations.
const val TAU = PI * 2
fun clamp(v: Double, lo: Double, hi: Double) = minOf(hi, maxOf(lo, v))
fun rand(a: Double, b: Double) = a + Random.nextDouble() * (b - a)
fun randInt(a: Int, b: Int) = (a..b).random()
/** difference of two angles (radians) folded into [-π, π]: positive = `a` is clockwise of `b` */
fun angDiff(a: Double, b: Double): Double {
    var d = a - b
    d -= TAU * floor(d / TAU + 0.5)
    return d
}
fun smoothstep(x: Double) = x * x * (3 - 2 * x)
