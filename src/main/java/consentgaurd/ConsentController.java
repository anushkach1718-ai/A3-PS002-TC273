
package consentgaurd;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ConsentController {

    private final Map<String, Map<String, Object>> consents =
            new ConcurrentHashMap<>();

    private final List<Map<String, Object>> auditLogs =
            new CopyOnWriteArrayList<>();

    private void addLog(String userId, String purpose,
                        String action, String result) {
        Map<String, Object> log = new LinkedHashMap<>();
        log.put("userId", userId);
        log.put("purpose", purpose);
        log.put("action", action);
        log.put("result", result);
        log.put("timestamp", new Date().toString());
        auditLogs.add(log);
    }

    @PostMapping("/consent/grant")
    public Map<String, Object> grantConsent(
            @RequestBody Map<String, String> request) {

        String userId = request.getOrDefault("userId", "demo-user");
        String purpose = request.get("purpose");
        String version = request.getOrDefault("noticeVersion", "1.0");

        if (purpose == null || purpose.isBlank()) {
            return Map.of("message", "Purpose is required");
        }

        Map<String, Object> consent = new LinkedHashMap<>();
        consent.put("userId", userId);
        consent.put("purpose", purpose);
        consent.put("status", "GRANTED");
        consent.put("noticeVersion", version);
        consent.put("timestamp", new Date().toString());

        consents.put(userId + "|" + purpose, consent);

        addLog(userId, purpose, "GRANT", "SUCCESS");

        return Map.of(
                "message", "Consent granted successfully",
                "consent", consent
        );
    }

    @PostMapping("/consent/withdraw")
    public Map<String, Object> withdrawConsent(
            @RequestBody Map<String, String> request) {

        String userId = request.getOrDefault("userId", "demo-user");
        String purpose = request.get("purpose");

        if (purpose == null || purpose.isBlank()) {
            return Map.of("message", "Purpose is required");
        }

        Map<String, Object> consent =
                consents.get(userId + "|" + purpose);

        if (consent == null ||
                !"GRANTED".equals(consent.get("status"))) {
            return Map.of("message", "No active consent found");
        }

        consent.put("status", "WITHDRAWN");
        consent.put("timestamp", new Date().toString());

        addLog(userId, purpose, "WITHDRAW", "SUCCESS");

        return Map.of("message", "Consent withdrawn successfully");
    }

    @GetMapping("/consent/status")
    public Map<String, Object> checkConsent(
            @RequestParam String userId,
            @RequestParam String purpose) {

        Map<String, Object> consent =
                consents.get(userId + "|" + purpose);

        boolean active = consent != null &&
                "GRANTED".equals(consent.get("status"));

        return Map.of(
                "userId", userId,
                "purpose", purpose,
                "consentActive", active,
                "status", active ? "GRANTED" : "NOT GRANTED"
        );
    }

    @PostMapping("/data/access")
    public Map<String, Object> accessData(
            @RequestBody Map<String, String> request) {

        String userId = request.getOrDefault("userId", "demo-user");
        String purpose = request.get("purpose");

        if (purpose == null || purpose.isBlank()) {
            return Map.of("message", "Purpose is required");
        }

        Map<String, Object> consent =
                consents.get(userId + "|" + purpose);

        boolean allowed = consent != null &&
                "GRANTED".equals(consent.get("status"));

        addLog(userId, purpose, "DATA_ACCESS",
                allowed ? "ALLOWED" : "DENIED");

        return Map.of(
                "accessGranted", allowed,
                "message", allowed
                        ? "Access allowed"
                        : "Access denied: Consent not active"
        );
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> getAuditLogs() {
        return auditLogs;
    }
}
