<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\EmployeeCreatedMail;

class EmployeeController extends Controller
{
    /**
     * 🔐 LOGIN
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $employee = Employee::where('email', $request->email)->first();

        if (!$employee || !Hash::check($request->password, $employee->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $employee->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $employee->id,
                'nom' => $employee->nom,
                'email' => $employee->email,
                'role' => $employee->role,
                'is_first_login' => (bool) $employee->is_first_login
            ],
            'token' => $token
        ]);
    }

    /**
     * 📋 LIST ALL EMPLOYEES (ADMIN ONLY)
     */
    public function index()
    {
        $user = auth()->user();
        if (!$user || (!$user->hasRole('admin') && !$user->hasRole('responsable'))) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        // return employees with denormalized role string (no roles pivot array)
        $employees = Employee::all()->makeHidden(['roles']);
        return response()->json($employees, 200);
    }

    /**
     *  CREATE EMPLOYEE (ADMIN ONLY)
     */
    public function store(Request $request)
    {
        $user = auth()->user();
        if (!$user || !$user->hasRole('admin')) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        $request->validate([
            'nom' => 'required|string|max:255',
            'email' => 'required|email|unique:employees',
            'tel' => 'required|string',
            'role_id' => 'required|exists:roles,id',
        ]);

        $plainPassword = Str::random(10);

        // 1️⃣ Create employee
        $employee = Employee::create([
            'nom' => $request->nom,
            'email' => $request->email,
            'password' => Hash::make($plainPassword),
            'tel' => $request->tel,
        ]);

        // 2️⃣ assign role
        $employee->roles()->attach($request->role_id);
        // set denormalized role column for convenience (used in some queries)
        $role = Role::find($request->role_id);
        if ($role) {
            $employee->role = $role->name;
            $employee->save();
        }

        // 3️⃣ send email
        Mail::to($employee->email)->send(
            new EmployeeCreatedMail($employee, $plainPassword)
        );

        return response()->json([
            'message' => 'Employee created successfully',
            'employee' => $employee->makeHidden(['roles'])
        ], 201);
    }

    /**
     * 👁️ SHOW EMPLOYEE (ADMIN ONLY)
     */
    public function show(Employee $employee)
    {
        $user = auth()->user();
        if (!$user || (!$user->hasRole('admin') && !$user->hasRole('responsable'))) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        return response()->json($employee->makeHidden(['roles']), 200);
    }

    /**
     * ✏️ UPDATE EMPLOYEE (ADMIN ONLY)
     */
    public function update(Request $request, Employee $employee)
    {
        $user = auth()->user();
        if (!$user || !$user->hasRole('admin')) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        // prevent admin from updating their own account via this admin endpoint
        if ($employee->id === $user->id) {
            return response()->json([
                'message' => 'Admins are not allowed to update their own account via this endpoint'
            ], 400);
        }

        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:employees,email,' . $employee->id,
            'password' => 'sometimes|string|min:6',
            'role_id' => 'sometimes|exists:roles,id',
            'tel' => 'sometimes|string',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        // handle role change if requested
        if (isset($validated['role_id'])) {
            $newRole = Role::find($validated['role_id']);
            if ($newRole) {
                $employee->roles()->sync([$newRole->id]);
                $employee->role = $newRole->name;
                unset($validated['role_id']);
            }
        }

        $employee->update($validated);

        return response()->json([
            'message' => 'Employee updated successfully',
            'employee' => $employee->makeHidden(['roles'])
        ], 200);
    }

    /**
     *  DELETE EMPLOYEE (ADMIN ONLY)
     */
    public function destroy(Employee $employee)
    {
        $user = auth()->user();
        if (!$user || !$user->hasRole('admin')) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        // prevent self delete
        if ($employee->id === $user->id) {
            return response()->json([
                'message' => 'You cannot delete yourself'
            ], 400);
        }

        $employee->delete();

        return response()->json([
            'message' => 'Employee deleted successfully'
        ], 200);
    }

    /**
     * CHANGE PASSWORD
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6'
        ]);

        $user = auth()->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect'
            ], 401);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json([
            'message' => 'Password updated successfully'
        ], 200);
    }

    /**
     * SET FIRST LOGIN PASSWORD OR SKIP
     */
    public function setFirstLoginPassword(Request $request)
    {
        $request->validate([
            'skip' => 'required|boolean',
            'password' => 'nullable|min:6'
        ]);

        $user = auth()->user();

        if (!$request->skip && $request->password) {
            $user->update([
                'password' => Hash::make($request->password),
                'is_first_login' => false
            ]);
            return response()->json(['message' => 'Password changed and first login flag cleared']);
        }

        // Just mark as no longer first login if skipped
        $user->update(['is_first_login' => false]);
        return response()->json(['message' => 'First login skipped']);
    }

    /**
     * FORGOT PASSWORD
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $employee = Employee::where('email', $request->email)->first();

        if (!$employee) {
            return response()->json(['message' => 'L\'utilisateur avec cet email n\'existe pas.'], 404);
        }

        // Clean out old tokens for this email
        \Illuminate\Support\Facades\DB::table('password_resets')->where('email', $request->email)->delete();

        // Create token (random string)
        $token = Str::random(64);
        \Illuminate\Support\Facades\DB::table('password_resets')->insert([
            'email' => $request->email,
            'token' => Hash::make($token),
            'created_at' => now()
        ]);

        // Send email with token
        Mail::to($employee->email)->send(
            new \App\Mail\ResetPasswordMail($employee, $token)
        );

        return response()->json(['message' => 'Un email de réinitialisation a été envoyé à votre adresse.']);
    }

    /**
     * RESET PASSWORD (via Token)
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6'
        ]);

        // Find the stored reset record
        $resetRecord = \Illuminate\Support\Facades\DB::table('password_resets')
            ->where('email', $request->email)
            ->first();

        if (!$resetRecord || !Hash::check($request->token, $resetRecord->token)) {
            return response()->json(['message' => 'Token invalide ou expiré.'], 400);
        }

        // Find user
        $employee = Employee::where('email', $request->email)->first();
        if (!$employee) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        // Update password and login state if applicable
        $employee->update([
            'password' => Hash::make($request->password),
            'is_first_login' => false // they just set it, so no longer a new login
        ]);

        // Delete used token
        \Illuminate\Support\Facades\DB::table('password_resets')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Mot de passe réinitialisé avec succès.']);
    }
}