import Foundation

// Port of src/lib/siteTime.js: "the owner's clock" drives the online/offline status, the auto skin and the clock on zune.sav.
enum TimeOfDay: String { case dawn, day, dusk, night }

enum SiteTime {
    static let tz = TimeZone(identifier: Site.timezone) ?? .current

    private static var cal: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = tz
        return c
    }

    static func hour(_ date: Date = Date()) -> Int { cal.component(.hour, from: date) }

    /// dawn [dawn, day) | day [day, dusk) | dusk [dusk, night) | night [night, dawn) (wraps midnight)
    static func timeOfDay(_ h: Int = hour()) -> TimeOfDay {
        let s = Site.schedule
        if h >= s.night || h < s.dawn { return .night }
        if h < s.day { return .dawn }
        if h < s.dusk { return .day }
        return .dusk
    }

    /// online = day + dusk; offline = dawn + night
    static func isOnlineHour(_ h: Int = hour()) -> Bool { h >= Site.schedule.day && h < Site.schedule.night }

    /// HH:MM:SS in the owner's timezone
    static func clock(_ date: Date = Date()) -> String {
        let c = cal.dateComponents([.hour, .minute, .second], from: date)
        return String(format: "%02d:%02d:%02d", c.hour ?? 0, c.minute ?? 0, c.second ?? 0)
    }

    /// like JS `toLocaleString('en-GB', { timeZone })`: 31/10/2026, 14:05:09
    static func dateTime(_ date: Date = Date()) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = tz
        f.dateFormat = "dd/MM/yyyy, HH:mm:ss"
        return f.string(from: date)
    }

    /// e.g. "GMT+7" (follows the timezone, including DST)
    static func gmtLabel(_ date: Date = Date()) -> String {
        let secs = tz.secondsFromGMT(for: date)
        let sign = secs < 0 ? "-" : "+"
        let h = abs(secs) / 3600, m = abs(secs) % 3600 / 60
        return m == 0 ? "GMT\(sign)\(h)" : "GMT\(sign)\(h):\(String(format: "%02d", m))"
    }
}
