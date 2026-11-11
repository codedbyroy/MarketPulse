import socket
import ipaddress
import urllib.parse
from typing import Tuple, List

# Blocked IP ranges
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),       # Link-local & cloud metadata (169.254.169.254)
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),         # Multicast
    ipaddress.ip_network("240.0.0.0/4"),         # Reserved
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv6
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("::1/128"),             # Loopback
    ipaddress.ip_network("fc00::/7"),            # Unique local
    ipaddress.ip_network("fe80::/10"),           # Link-local
    ipaddress.ip_network("ff00::/8"),            # Multicast
]

class SSRFError(Exception):
    pass

def validate_url_for_ssrf(url: str) -> Tuple[bool, str]:
    """
    Validates that a URL does not point to internal, private, or metadata IP addresses.
    Returns (is_valid, error_message_or_empty).
    """
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception as e:
        return False, f"Malformed URL: {str(e)}"

    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Invalid scheme '{parsed.scheme}'. Only 'http' and 'https' are allowed."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL must include a valid hostname."

    # Direct IP string or hostname
    try:
        # Check if hostname itself is directly an IP literal
        ip = ipaddress.ip_address(hostname)
        for net in BLOCKED_NETWORKS:
            if ip in net:
                return False, f"Access to IP address {ip} in network {net} is blocked for SSRF protection."
        return True, ""
    except ValueError:
        pass

    # Resolve domain to all IP addresses
    try:
        resolved_ips: List[str] = []
        for res in socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP):
            sockaddr = res[4]
            ip_str = sockaddr[0]
            if ip_str not in resolved_ips:
                resolved_ips.append(ip_str)

        if not resolved_ips:
            return False, f"Could not resolve host '{hostname}'"

        for ip_str in resolved_ips:
            ip = ipaddress.ip_address(ip_str)
            for net in BLOCKED_NETWORKS:
                if ip in net:
                    return False, f"Host '{hostname}' resolves to blocked IP {ip} ({net}). Request rejected."

        return True, ""
    except socket.gaierror as e:
        return False, f"DNS resolution failed for host '{hostname}': {str(e)}"
    except Exception as e:
        return False, f"Error validating host '{hostname}': {str(e)}"
