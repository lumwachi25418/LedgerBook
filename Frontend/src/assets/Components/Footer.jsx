import { Heart, Mail, MapPin, Phone } from "lucide-react";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-200 mt-12">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              ⛪ Church Ledger
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              A modern digital ledger system designed to help churches manage their financial records efficiently and transparently.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-gray-400 hover:text-white transition">
                  📊 Ledger Entry
                </a>
              </li>
              <li>
                <a href="/records" className="text-gray-400 hover:text-white transition">
                  📋 View Records
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  ❓ Help & Support
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Support</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2 hover:text-white transition cursor-pointer">
                <Mail className="w-4 h-4" />
                <span>support@churchledger.com</span>
              </div>
              <div className="flex items-center gap-2 hover:text-white transition cursor-pointer">
                <Phone className="w-4 h-4" />
                <span>+254 700 000 000</span>
              </div>
              <div className="flex items-center gap-2 hover:text-white transition cursor-pointer">
                <MapPin className="w-4 h-4" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-400 flex items-center gap-2 mb-4 md:mb-0">
            <Heart className="w-4 h-4 text-red-500" />
            <p>&copy; {currentYear} Church Ledger Book. All rights reserved.</p>
          </div>

          {/* Social Links */}
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition">
              📱 Facebook
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              🐦 Twitter
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              📧 Email
            </a>
          </div>
        </div>
      </div>

      {/* Top Border Accent */}
      <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600"></div>
    </footer>
  );
}

export default Footer;