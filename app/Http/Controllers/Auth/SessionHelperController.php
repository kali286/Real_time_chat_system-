<?php

namespace App\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;

class SessionHelperController extends Controller
{
    /**
     * Clear any existing session (logout) and redirect to the given next URL (default: login).
     * This prevents the situation where an admin who is logged in on the same browser
     * follows a user email link and is immediately redirected to the admin dashboard.
     */
    public function clearAndRedirect(Request $request)
    {
        try {
            Auth::logout();
        } catch (\Throwable $e) {
            // ignore
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $next = $request->query('next', route('login'));

        return redirect($next);
    }
}
