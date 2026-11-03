import Foundation

// Port of src/lib/math.js: the small math / random helpers shared by the animations.
let TAU = Double.pi * 2
func clamp(_ v: Double, _ lo: Double, _ hi: Double) -> Double { min(hi, max(lo, v)) }
func rand(_ a: Double, _ b: Double) -> Double { a + Double.random(in: 0..<1) * (b - a) }
func randInt(_ a: Int, _ b: Int) -> Int { Int.random(in: a...b) }
/// difference of two angles (radians) folded into [-π, π]: positive = `a` is clockwise of `b`
func angDiff(_ a: Double, _ b: Double) -> Double {
    var d = a - b
    d -= TAU * floor(d / TAU + 0.5)
    return d
}
func smoothstep(_ x: Double) -> Double { x * x * (3 - 2 * x) }
